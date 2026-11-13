"""Exercise actual authenticated application HTTP endpoints; no route replacement."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time

import httpx
import psutil

w = Path('/Users/red/Documents/ChatGPT/ODY')
phase = sys.argv[1]
assert phase in {'before', 'after'}
root = w / '.runtime' / ('calendar-invalid-dates-' + phase)
root.mkdir(exist_ok=False)
(root / 'data').mkdir()
(root / 'tmp').mkdir()
source = w / ('.runtime/calendar-ics-baseline' if phase == 'before' else 'odysseus')
origin = 'http://127.0.0.1:17871'
with socket.socket() as sock:
    assert sock.connect_ex(('127.0.0.1', 17871)) != 0
env = dict(os.environ, CAL_FORM_LAYOUT_ROOT=str(root), CAL_FORM_LAYOUT_SOURCE=str(source), ODYSSEUS_DATA_DIR=str(root/'data'), DATABASE_URL=f'sqlite:///{root}/data/app.db', TMPDIR=str(root/'tmp'), ODYSSEUS_TOOL_INDEX_PREWARM='0', AUTH_ENABLED='true', APP_PORT='17871', ODYSSEUS_INTERNAL_BASE=origin)
log = (root / 'application.log').open('w')
proc = subprocess.Popen([sys.executable, str(w/'research/calendar-form-layout-smoke-app.py')], cwd=source, env=env, stdout=log, stderr=subprocess.STDOUT)
result = {'phase': phase, 'source': str(source), 'cases': []}
try:
    for _ in range(150):
        assert proc.poll() is None
        try:
            if httpx.get(origin+'/api/health', timeout=2).status_code == 200:
                break
        except httpx.ConnectError:
            pass
        time.sleep(.2)
    else:
        raise AssertionError('Application readiness timeout')
    with httpx.Client(base_url=origin, timeout=20) as client:
        auth = client.post('/api/auth/login', json={'username':'calendar-form-layout-smoke','password':(root/'password').read_text()})
        assert auth.status_code == 200
        created = client.post('/api/calendar/events', json={'summary':'Original HTTP control','dtstart':'2030-01-02T09:00:00+03:00','dtend':'2030-01-02T10:00:00+03:00'})
        assert created.status_code == 200, created.text
        uid = created.json()['uid']
        original = client.get('/api/calendar/events/'+uid).json()['event']
        for method in ['POST', 'PUT']:
            for field, value in [('dtstart',''),('dtstart','not-a-date'),('dtend','not-a-date'),('dtend','2030-02-30')]:
                payload = {'summary':'Must not persist', 'dtstart':'2030-01-02T09:00:00+03:00',field:value}
                response = client.request(method, '/api/calendar/events'+('' if method == 'POST' else '/'+uid), json=payload)
                status = 500 if phase == 'before' else 400
                assert response.status_code == status, response.text
                assert client.get('/api/calendar/events/'+uid).json()['event'] == original
                result['cases'].append({'method':method,'field':field,'value':value,'status':response.status_code,'response':response.json(),'original_event_unchanged':True})
        update = client.put('/api/calendar/events/'+uid, json={'summary':'Corrected HTTP control','dtstart':'2030-01-03T09:00:00+03:00','dtend':'2030-01-03T10:00:00+03:00'})
        assert update.status_code == 200, update.text
        final = client.get('/api/calendar/events/'+uid).json()['event']
        assert final['summary'] == 'Corrected HTTP control'
        assert final['dtstart'] == '2030-01-03T06:00:00Z'
        assert final['dtend'] == '2030-01-03T07:00:00Z'
        result['valid_create'] = created.status_code
        result['valid_retry_update'] = update.status_code
        result['saved_start'] = final['dtstart']
        result['saved_end'] = final['dtend']
finally:
    children = psutil.Process(proc.pid).children(recursive=True) if proc.poll() is None else []
    proc.terminate()
    try:
        proc.wait(timeout=20)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)
    for child in children:
        try:
            child.terminate()
        except psutil.NoSuchProcess:
            pass
    _, alive = psutil.wait_procs(children, timeout=5)
    for child in alive:
        child.kill()
    _, remaining = psutil.wait_procs(alive, timeout=5)
    log.close()
    with socket.socket() as sock:
        port_closed = sock.connect_ex(('127.0.0.1', 17871)) != 0
    result['cleanup'] = {'app_exit':proc.returncode,'children_left':[c.pid for c in remaining],'port_closed':port_closed}
    (w/'research'/f'pr-096-native-{phase}.json').write_text(json.dumps(result, indent=2)+'\n')
assert not remaining and port_closed
print(json.dumps({'phase':phase,'cases':len(result['cases']),'status':status,'valid_create':created.status_code,'valid_retry_update':update.status_code,'cleanup':result['cleanup']}))
