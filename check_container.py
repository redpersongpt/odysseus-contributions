"""Owned-volume checks through the unmodified maintained Compose startup."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parent
IMAGE = 'docker.io/searxng/searxng:2026.10.24-ef0ec03da@sha256:7c7cbe509429e82755104b2a95f52085a98633c95d53f44e4e905fa3a59f08c8'
RUN_ID = uuid.uuid4().hex[:10]
result = {'started_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'image': IMAGE, 'run_id': RUN_ID, 'cases': []}
owned_projects = []
owned_volumes = []
start_at = sys.argv[1] if len(sys.argv) > 1 else None
waiting_for_start = bool(start_at)

def run(args, *, env=None, input=None, check=True, timeout=180):
    p = subprocess.run(args, env=env, input=input, text=True, capture_output=True, timeout=timeout)
    if check and p.returncode:
        raise RuntimeError(f'{args[0:4]} exited {p.returncode}: {p.stderr[-6000:]} {p.stdout[-2000:]}')
    return p

SEED = '''
import json,os,pwd,stat,sys
from pathlib import Path
import yaml
config=json.load(sys.stdin)
p=Path('/etc/searxng/settings.yml')
p.write_text(yaml.safe_dump(config,allow_unicode=True,sort_keys=False))
owner=pwd.getpwnam('searxng')
os.chmod(p,0o640)
os.chown(p,owner.pw_uid,owner.pw_gid)
print(json.dumps({'uid':p.stat().st_uid,'gid':p.stat().st_gid,'mode':stat.S_IMODE(p.stat().st_mode)}))
'''

INSPECT = '''
import hashlib,json,os,pwd,stat,urllib.request
from pathlib import Path
os.environ['SEARXNG_SETTINGS_PATH']='/etc/searxng/settings.yml'
from searx import settings
p=Path('/etc/searxng/settings.yml');s=p.stat();owner=pwd.getpwnam('searxng')
with urllib.request.urlopen('http://127.0.0.1:8080/',timeout=20) as response:status=response.status
with urllib.request.urlopen('http://127.0.0.1:8080/config',timeout=20) as response:
 config_status=response.status;config=json.load(response)
print(json.dumps({'http_status':status,'config_http_status':config_status,
 'resolved_non_disabled':[e['name'] for e in settings['engines'] if not e.get('disabled',False)],
 'http_config_engine_names':[e.get('name') for e in config.get('engines',[])],
 'http_config_enabled_names':[e['name'] for e in config.get('engines',[]) if e.get('enabled',False)],
 'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'inode':s.st_ino,'mtime_ns':s.st_mtime_ns,
 'uid':s.st_uid,'gid':s.st_gid,'mode':stat.S_IMODE(s.st_mode),
 'expected_uid':owner.pw_uid,'expected_gid':owner.pw_gid}))
'''

common = {'server': {'secret_key': 'owned-pr083-compose-validation-only-539ae69b', 'limiter': False},
          'search': {'formats': ['html', 'json']}}
custom = {'name': 'owned custom', 'engine': 'json_engine', 'disabled': False,
          'search_url': 'https://example.invalid/search?q={query}', 'results_query': 'items',
          'url_query': 'url', 'title_query': 'title', 'content_query': 'content'}
unicode_custom = dict(custom, name='owned "quoted" \\ Arşiv')
selections = [
    ('selected-default', [{'name': 'brave', 'disabled': False}], ['brave']),
    ('disabled-default', [{'name': 'brave', 'disabled': True}], []),
    ('custom-only', [custom], ['owned custom']),
    ('mixed', [{'name': 'brave', 'disabled': False}, custom], ['brave', 'owned custom']),
    ('empty', [], []),
    ('unicode-custom', [unicode_custom], [unicode_custom['name']]),
]

def inspect_compose(compose, env):
    cid = run(compose + ['ps', '-q', 'searxng'], env=env).stdout.strip()
    assert cid
    container = json.loads(run(['docker', 'inspect', cid]).stdout)[0]
    assert container['State']['Health']['Status'] == 'healthy'
    data = json.loads(run(compose + ['exec', '-T', 'searxng',
        '/usr/local/searxng/.venv/bin/python', '-c', INSPECT], env=env).stdout)
    assert data['http_status'] == data['config_http_status'] == 200
    assert data['mode'] == 0o640 and data['uid'] == data['expected_uid'] and data['gid'] == data['expected_gid']
    assert {cap.removeprefix('CAP_') for cap in container['HostConfig']['CapDrop']} == {'ALL'}
    assert {cap.removeprefix('CAP_') for cap in container['HostConfig']['CapAdd']} == {'CHOWN', 'SETGID', 'SETUID', 'DAC_OVERRIDE'}, container['HostConfig']['CapAdd']
    assert not container['HostConfig']['PortBindings']
    data['started_at'] = container['State']['StartedAt']
    data['caps_drop'] = container['HostConfig']['CapDrop']
    data['caps_add'] = container['HostConfig']['CapAdd']
    data['health'] = container['State']['Health']['Status']
    return cid, data

try:
    result['docker_version'] = run(['docker', 'version', '--format', '{{.Server.Version}} {{.Server.Arch}}']).stdout.strip()
    result['compose_version'] = run(['docker', 'compose', 'version']).stdout.strip()
    image = json.loads(run(['docker', 'image', 'inspect', IMAGE]).stdout)[0]
    result['image_id'] = image['Id']
    result['image_architecture'] = image['Architecture']
    result['repo_digests'] = image['RepoDigests']
    assert image['Architecture'] == 'arm64'
    for phase in ('before', 'after'):
        cases = [(label, dict(common, engines=engines), expected) for label, engines, expected in selections]
        if phase == 'after':
            # Build the explicit-false control from a complete real image config,
            # so server startup is valid without inheriting omitted defaults.
            defaults = json.loads(run(['docker', 'run', '--rm', '--entrypoint',
                '/usr/local/searxng/.venv/bin/python', IMAGE, '-c',
                'import json,yaml;print(json.dumps(yaml.safe_load(open("/usr/local/searxng/searx/settings.yml"))))']).stdout)
            brave = next(engine for engine in defaults['engines'] if engine['name'] == 'brave')
            brave['disabled'] = False
            for section, values in common.items():
                defaults[section].update(values)
            defaults.update({'use_default_settings': False, 'engines': [brave]})
            cases += [
                ('intentional-overlay', dict(common, use_default_settings=True,
                    engines=[{'name': 'brave', 'disabled': False}]), None),
                ('no-engine-policy', dict(common), None),
                ('explicit-no-inheritance', defaults, ['brave']),
            ]
        for label, config, expected in cases:
            if waiting_for_start:
                if phase+':'+label != start_at:
                    continue
                waiting_for_start = False
            project = f'pr083-{phase}-{label}-{RUN_ID}'
            volume = project + '-settings'
            env = dict(os.environ, SEARXNG_VALIDATION_IMAGE=IMAGE,
                SEARXNG_VALIDATION_CHECKS=str(ROOT/phase),
                SEARXNG_VALIDATION_VOLUME=volume,
                SEARXNG_SECRET='owned-pr083-compose-validation-only-539ae69b')
            compose = ['docker', 'compose', '--env-file', '/dev/null', '--project-name', project,
                '-f', str(ROOT/'base-compose.yml'), '-f', str(ROOT/'validation.compose.yml')]
            assert run(['docker', 'volume', 'inspect', volume], check=False).returncode != 0
            run(['docker', 'volume', 'create', '--label', 'odysseus.pr083='+RUN_ID, volume])
            owned_volumes.append(volume)
            seed = json.loads(run(['docker', 'run', '--rm', '-i', '--user', '0',
                '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--cap-add', 'SETGID',
                '--cap-add', 'SETUID', '--cap-add', 'DAC_OVERRIDE',
                '-v', volume+':/etc/searxng', '--entrypoint', '/usr/local/searxng/.venv/bin/python',
                IMAGE, '-c', SEED], input=json.dumps(config)).stdout)
            owned_projects.append((compose, env))
            run(compose + ['up', '--detach', '--no-deps', '--no-build', '--pull', 'never',
                           '--wait', '--wait-timeout', '150', 'searxng'], env=env)
            cid, first = inspect_compose(compose, env)
            actual = first['resolved_non_disabled']
            if expected is not None and phase == 'after':
                assert sorted(actual) == sorted(expected), (phase, label, actual, expected)
                # SearXNG normalizes registered engine names to lowercase.
                assert sorted(first['http_config_enabled_names']) == sorted(name.lower() for name in expected), (phase, label, first['http_config_enabled_names'], expected)
            elif expected is not None:
                assert set(actual)-set(expected), (phase, label, actual)
                assert set(first['http_config_enabled_names'])-set(expected), (phase, label, first['http_config_enabled_names'])
            else:
                assert len(actual) == 121, (label, len(actual))
            run(compose + ['restart', '--no-deps', 'searxng'], env=env)
            for _ in range(240):
                state = json.loads(run(['docker', 'inspect', cid]).stdout)[0]['State']
                assert state['Running'], state['Status']
                if state['Health']['Status'] == 'healthy' and state['StartedAt'] != first['started_at']:
                    break
                time.sleep(.5)
            else:
                raise AssertionError('restart did not become healthy')
            _, second = inspect_compose(compose, env)
            assert first['started_at'] != second['started_at']
            assert all(first[key] == second[key] for key in ('sha256', 'inode', 'mtime_ns', 'uid', 'gid', 'mode', 'resolved_non_disabled', 'http_config_enabled_names'))
            row = {'phase': phase, 'label': label, 'expected': expected,
                   'seed': seed, 'first': first, 'second': second, 'idempotent_restart': True}
            result['cases'].append(row)
            print('CASE '+json.dumps({'phase': phase, 'label': label,
                'resolved_non_disabled_count': len(actual), 'http_enabled_count':len(first['http_config_enabled_names']), 'healthy_twice': True}), flush=True)
            run(compose + ['down', '--remove-orphans'], env=env)
            owned_projects.pop()
            run(['docker', 'volume', 'rm', volume])
            owned_volumes.remove(volume)
finally:
    cleanup_errors = []
    for compose, env in reversed(owned_projects):
        p = run(compose+['down', '--remove-orphans'], env=env, check=False)
        if p.returncode: cleanup_errors.append(p.stderr[-1500:])
    for volume in owned_volumes:
        meta = json.loads(run(['docker', 'volume', 'inspect', volume]).stdout)[0]
        assert meta['Labels']['odysseus.pr083'] == RUN_ID
        p = run(['docker', 'volume', 'rm', volume], check=False)
        if p.returncode: cleanup_errors.append(p.stderr[-1500:])
    result['cleanup_errors'] = cleanup_errors
    result['remaining_owned_volumes'] = run(['docker', 'volume', 'ls', '-q', '--filter', 'label=odysseus.pr083='+RUN_ID]).stdout.split()
    result['finished_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    print('PR083_RESULT:'+json.dumps(result), flush=True)
