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
root = w / '.runtime' / ('contacts-failure-20261119-' + phase)
root.mkdir(exist_ok=False)
(root / 'data').mkdir()
(root / 'tmp').mkdir()
source = w / 'odysseus'
origin = 'http://127.0.0.1:17836'
with socket.socket() as sock:
    assert sock.connect_ex(('127.0.0.1', 17836)) != 0
env = dict(os.environ, CONTACTS_FAILURE_ROOT=str(root), CONTACTS_FAILURE_SOURCE=str(source), ODYSSEUS_DATA_DIR=str(root/'data'), DATABASE_URL=f'sqlite:///{root}/data/app.db', TMPDIR=str(root/'tmp'), ODYSSEUS_TOOL_INDEX_PREWARM='0', AUTH_ENABLED='true', APP_PORT='17836', ODYSSEUS_INTERNAL_BASE=origin)
log = (root / 'application.log').open('w')
proc = subprocess.Popen([sys.executable, str(w/'research/contacts-failure-smoke-app.py')], cwd=source, env=env, stdout=log, stderr=subprocess.STDOUT)
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
    subprocess.run(['node',str(w/'research/contacts-failure-browser-20261119.cjs'),phase],cwd=source,check=True,timeout=240)

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
        port_closed = sock.connect_ex(('127.0.0.1', 17836)) != 0
    result['cleanup'] = {'app_exit':proc.returncode,'children_left':[c.pid for c in remaining],'port_closed':port_closed}
    (w/'research'/f'pr-7150-native-cleanup-{phase}-20261119.json').write_text(json.dumps(result, indent=2)+'\n')
assert not remaining and port_closed
print(json.dumps(result))
