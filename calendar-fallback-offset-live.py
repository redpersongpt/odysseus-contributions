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
root = w/'.runtime'/('calendar-fallback-offset-'+phase)
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
result = {'phase':phase,'source':str(source),'cases':[],'controls':[]}
formats = [
    ('Sat, 05 Jan 2030 14:00:00 +0900','2030-01-05T05:00:00'),
    ('January 5, 2030 14:00 +0530','2030-01-05T08:30:00'),
    ('January 5, 2030 14:00 +0545','2030-01-05T08:15:00'),
    ('January 5, 2030 14:00 -0330','2030-01-05T17:30:00'),
    ('January 5, 2030 14:00 UTC','2030-01-05T14:00:00'),
    ('Sat, 05 Jan 2030 14:00:00 GMT','2030-01-05T14:00:00'),
]
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
    with httpx.Client(base_url=origin,timeout=20) as client:
        login=client.post('/api/auth/login',json={'username':'calendar-form-layout-smoke','password':(root/'password').read_text()})
        assert login.status_code==200
        uids=[]
        for method in ['POST','PUT']:
            for raw,expected in formats:
                uid=None
                if method=='PUT':
                    seed=client.post('/api/calendar/events',json={'summary':'Naive seed','dtstart':'2030-01-01T09:00:00'})
                    assert seed.status_code==200
                    uid=seed.json()['uid']
                response=client.request(method,'/api/calendar/events'+('/'+uid if uid else ''),json={'summary':'Native offset '+method,'dtstart':raw,'dtend':raw.replace('14:00','15:00')})
                assert response.status_code==200,response.text
                uid=uid or response.json()['uid'];uids.append(uid)
                saved=client.get('/api/calendar/events/'+uid).json()['event']
                suffix='Z' if phase=='after' else ''
                assert saved['dtstart']==expected+suffix,saved
                end=(datetime.fromisoformat(expected)+timedelta(hours=1)).isoformat()+suffix
                assert saved['dtend']==end,saved
                assert saved['is_utc']==(phase=='after')
                result['cases'].append({'method':method,'input':raw,'status':response.status_code,'start':saved['dtstart'],'end':saved['dtend'],'is_utc':saved['is_utc']})
        for raw,expected,utc in [
            ('2030-01-05T14:00:00+09:00','2030-01-05T05:00:00Z',True),
            ('2030-01-05T14:00:00','2030-01-05T14:00:00',False),
            ('January 5, 2030 14:00','2030-01-05T14:00:00',False),
        ]:
            response=client.post('/api/calendar/events',json={'summary':'Positive control','dtstart':raw})
            assert response.status_code==200
            data=response.json();uids.append(data['uid']);assert data['event']['dtstart']==expected and data['event']['is_utc']==utc
            result['controls'].append({'input':raw,'start':expected,'is_utc':utc,'status':response.status_code})
        for uid in uids:
            deleted=client.delete('/api/calendar/events/'+uid);assert deleted.status_code==200
        result['synthetic_HTTP_records_cleaned']=len(uids)
    subprocess.run(['node',str(w/'research/calendar-fallback-offset-browser.cjs'),phase],cwd=w/'odysseus',env=env,check=True,timeout=180)
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
    (w/'research'/f'pr-098-native-{phase}.json').write_text(json.dumps(result,indent=2)+'\n')
    assert not remaining and closed
print(json.dumps({'phase':phase,'HTTP_cases':len(result['cases']),'controls':len(result['controls']),'is_utc':phase=='after','cleanup':result['cleanup']}))
