"""Native authenticated Calendar CRUD and real UI, without route replacements."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from datetime import datetime, timedelta

import httpx
import psutil

w = Path('/Users/red/Documents/ChatGPT/ODY')
phase = sys.argv[1]
assert phase in {'before','after'}
root = w/'.runtime'/('document-delete-snapshot-'+phase)
root.mkdir(exist_ok=False)
(root/'data').mkdir()
(root/'tmp').mkdir()
source = w/('.runtime/calendar-ics-baseline' if phase=='before' else 'odysseus')
origin = 'http://127.0.0.1:17871'
with socket.socket() as s:
    assert s.connect_ex(('127.0.0.1',17871)) != 0
env = dict(os.environ, CAL_FORM_LAYOUT_ROOT=str(root), CAL_FORM_LAYOUT_SOURCE=str(source), ODYSSEUS_DATA_DIR=str(root/'data'), DATABASE_URL=f'sqlite:///{root}/data/app.db', TMPDIR=str(root/'tmp'), ODYSSEUS_TOOL_INDEX_PREWARM='0', AUTH_ENABLED='true', APP_PORT='17871', ODYSSEUS_INTERNAL_BASE=origin)
log = (root/'application.log').open('w')
p = subprocess.Popen([sys.executable,str(w/'research/calendar-form-layout-smoke-app.py')],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
result = {'phase':phase,'source':str(source),'purpose':'Actual authenticated app; normal HTTP/DOM, browser CDP 1500ms network latency only.'}
try:
    for _ in range(150):
        assert p.poll() is None
        try:
            if httpx.get(origin+'/api/health',timeout=2).status_code==200:
                break
        except httpx.ConnectError:
            pass
        time.sleep(.2)
    else:
        raise AssertionError('App readiness timeout')
    subprocess.run(['node',str(w/'research/document-delete-snapshot-browser.cjs'),phase],cwd=w/'odysseus',env=env,check=True,timeout=180)
finally:
    children=psutil.Process(p.pid).children(recursive=True) if p.poll() is None else []
    p.terminate()
    try:
        p.wait(timeout=20)
    except subprocess.TimeoutExpired:
        p.kill();p.wait(timeout=5)
    for c in children:
        try:c.terminate()
        except psutil.NoSuchProcess:pass
    _,alive=psutil.wait_procs(children,timeout=5)
    for c in alive:c.kill()
    _,remaining=psutil.wait_procs(alive,timeout=5)
    log.close()
    with socket.socket() as s:closed=s.connect_ex(('127.0.0.1',17871))!=0
    result['cleanup']={'app_exit':p.returncode,'children_left':[c.pid for c in remaining],'port_closed':closed}
    (w/'research'/f'pr-099-native-{phase}.json').write_text(json.dumps(result,indent=2)+'\n')
    assert not remaining and closed
print(json.dumps(result))
