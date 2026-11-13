import os
import subprocess
import sys
import time
import json
from pathlib import Path
import httpx
import psutil

phase=sys.argv[1];assert phase in {'before','after'}
w=Path('/Users/red/Documents/ChatGPT/ODY');root=w/'.runtime'/('nested-list-'+phase)
root.mkdir(exist_ok=False);(root/'data').mkdir();(root/'tmp').mkdir()
source=w/('.runtime/calendar-ics-baseline' if phase=='before' else 'odysseus')
env=dict(os.environ,NESTED_LIST_ROOT=str(root),NESTED_LIST_SOURCE=str(source),ODYSSEUS_DATA_DIR=str(root/'data'),DATABASE_URL=f'sqlite:///{root}/data/app.db',TMPDIR=str(root/'tmp'),ODYSSEUS_TOOL_INDEX_PREWARM='0',AUTH_ENABLED='true',APP_PORT='17871',ODYSSEUS_INTERNAL_BASE='http://127.0.0.1:17871')
log=(w/'research'/f'nested-list-{phase}-app.log').open('w')
p=subprocess.Popen([sys.executable,str(w/'research/nested-list-smoke-app.py')],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
try:
    for _ in range(150):
        assert p.poll() is None, 'app exited'
        try:
            if httpx.get('http://127.0.0.1:17871/api/health',timeout=2).status_code==200:break
        except httpx.ConnectError:pass
        time.sleep(.2)
    else:raise AssertionError('app readiness timeout')
    subprocess.run(['node',str(w/'research/nested-list-browser.cjs'),phase],cwd=w/'odysseus',check=True,timeout=240)
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
    (w/'research'/f'nested-list-{phase}-shutdown.json').write_text(json.dumps({'app_exit':p.returncode,'children_left':[c.pid for c in remaining]}))
