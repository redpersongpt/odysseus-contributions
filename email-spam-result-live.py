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
assert phase in {'before', 'after', 'probe'}
root = w/'.runtime'/('email-spam-results-'+phase)
root.mkdir(exist_ok=False)
(root/'data').mkdir()
(root/'tmp').mkdir()
source = w/('.runtime/calendar-ics-baseline' if phase in {'before','probe'} else 'odysseus')
origin = 'http://127.0.0.1:17871'
with socket.socket() as s:
    assert s.connect_ex(('127.0.0.1',17871)) != 0
env = dict(os.environ, EMAIL_MOVE_ROOT=str(root), EMAIL_MOVE_SOURCE=str(source), ODYSSEUS_DATA_DIR=str(root/'data'), DATABASE_URL=f'sqlite:///{root}/data/app.db', TMPDIR=str(root/'tmp'), ODYSSEUS_EMAIL_FIXTURE='1', ODYSSEUS_TOOL_INDEX_PREWARM='0', AUTH_ENABLED='true', APP_PORT='17871', ODYSSEUS_INTERNAL_BASE=origin)
log = (root/'application.log').open('w')
p = subprocess.Popen([sys.executable, str(w/'research/email-move-result-smoke-app.py')],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
try:
    for _ in range(150):
        assert p.poll() is None, 'App exited'
        try:
            if httpx.get(origin+'/api/health',timeout=2).status_code==200:
                break
        except httpx.ConnectError:
            pass
        time.sleep(.2)
    else:
        raise AssertionError('App readiness timeout')
    subprocess.run(['node',str(w/'research/email-spam-result-browser.cjs'),phase],cwd=w/'odysseus',env=env,check=True,timeout=240)
finally:
    children = psutil.Process(p.pid).children(recursive=True) if p.poll() is None else []
    p.terminate()
    try:
        p.wait(timeout=20)
    except subprocess.TimeoutExpired:
        p.kill();p.wait(timeout=5)
    for c in children:
        try:
            c.terminate()
        except psutil.NoSuchProcess:
            pass
    _,alive=psutil.wait_procs(children,timeout=5)
    for c in alive:
        c.kill()
    _,remaining=psutil.wait_procs(alive,timeout=5)
    log.close()
    with socket.socket() as s:
        closed=s.connect_ex(('127.0.0.1',17871))!=0
    (w/'research'/f'pr-097-spam-{phase}-cleanup.json').write_text(json.dumps({'app_exit':p.returncode,'children_left':[c.pid for c in remaining],'port_closed':closed},indent=2)+'\n')
    assert not remaining and closed
