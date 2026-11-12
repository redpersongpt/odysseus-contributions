import os
import subprocess
import sys
import time
import json
from pathlib import Path
import httpx
import psutil

phase=sys.argv[1];assert phase in {'before','after'}
w=Path('/Users/red/Documents/ChatGPT/ODY');root=w/'.runtime'/('raster-chat-'+phase)
root.mkdir(exist_ok=False);(root/'data').mkdir()
source=w/('.runtime/calendar-ics-baseline' if phase=='before' else 'odysseus')
env=dict(os.environ,RASTER_CHAT_ROOT=str(root),RASTER_CHAT_SOURCE=str(source),ODYSSEUS_DATA_DIR=str(root/'data'),DATABASE_URL=f'sqlite:///{root}/data/app.db',AUTH_ENABLED='true',APP_PORT='17871',ODYSSEUS_INTERNAL_BASE='http://127.0.0.1:17871')
log=(w/'research'/f'raster-chat-{phase}-app.log').open('w')
p=subprocess.Popen([sys.executable,str(w/'research/raster-chat-smoke-app.py')],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
try:
    for _ in range(150):
        assert p.poll() is None, 'app exited'
        try:
            if httpx.get('http://127.0.0.1:17871/api/health',timeout=2).status_code==200:break
        except httpx.ConnectError:pass
        time.sleep(.2)
    else:raise AssertionError('app readiness timeout')
    subprocess.run(['node',str(w/'research/raster-chat-browser.cjs'),phase],cwd=w/'odysseus',check=True,timeout=240)
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
    (w/'research'/f'raster-chat-{phase}-shutdown.json').write_text(json.dumps({'app_exit':p.returncode,'children_left':[c.pid for c in remaining]}))
