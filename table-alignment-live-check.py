import os
import socket
import subprocess
import sys
import time
import json
from pathlib import Path
import httpx
import psutil

for port in (17871,17872):
    with socket.socket() as sock: assert sock.connect_ex(('127.0.0.1',port)) != 0, f'fixture port already occupied: {port}'

phase=sys.argv[1];assert phase in {'before','after'}
w=Path('/Users/red/Documents/ChatGPT/ODY');root=w/'.runtime'/('table-alignment-'+phase)
root.mkdir(exist_ok=False);(root/'data').mkdir();(root/'tmp').mkdir()
source=w/('.runtime/calendar-ics-baseline' if phase=='before' else 'odysseus')
env=dict(os.environ,TABLE_ALIGNMENT_ROOT=str(root),TABLE_ALIGNMENT_SOURCE=str(source),ODYSSEUS_DATA_DIR=str(root/'data'),DATABASE_URL=f'sqlite:///{root}/data/app.db',TMPDIR=str(root/'tmp'),ODYSSEUS_TOOL_INDEX_PREWARM='0',AUTH_ENABLED='true',APP_PORT='17871',ODYSSEUS_INTERNAL_BASE='http://127.0.0.1:17871')
log=(w/'research'/f'table-alignment-{phase}-app.log').open('w')
p=subprocess.Popen([sys.executable,str(w/'research/table-alignment-smoke-app.py')],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
try:
    for _ in range(150):
        assert p.poll() is None, 'app exited'
        try:
            if httpx.get('http://127.0.0.1:17871/api/health',timeout=2).status_code==200:break
        except httpx.ConnectError:pass
        time.sleep(.2)
    else:raise AssertionError('app readiness timeout')
    subprocess.run(['node',str(w/'research/table-alignment-browser.cjs'),phase],cwd=w/'odysseus',env=env,check=True,timeout=120)
finally:
    children=psutil.Process(p.pid).children(recursive=True) if p.poll() is None else []
    p.terminate()
    try:p.wait(timeout=20)
    except subprocess.TimeoutExpired:p.kill();p.wait(timeout=5)
    for child in children:
        try:child.terminate()
        except psutil.NoSuchProcess:pass
    _,alive=psutil.wait_procs(children,timeout=5)
    for child in alive:child.kill()
    _,remaining=psutil.wait_procs(alive,timeout=5)
    log.close()
    (w/'research'/f'table-alignment-{phase}-shutdown.json').write_text(json.dumps({'app_exit':p.returncode,'children_left':[c.pid for c in remaining]}))
