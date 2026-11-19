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
root = w / '.runtime' / ('calendar-overflow-20261119-' + phase)
root.mkdir(exist_ok=False)
(root / 'data').mkdir()
(root / 'tmp').mkdir()
source = w / 'odysseus'
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
        import sqlite3
        for start, all_day in [('9999-12-31T23:30:00',False),('9999-12-31',True)]:
            response=client.post('/api/calendar/events',json={'summary':'Overflow boundary','dtstart':start,'all_day':all_day})
            assert response.status_code == (500 if phase=='before' else 400),response.text
            if phase=='after':assert response.json()=={'detail':'Invalid dtstart'}
            with sqlite3.connect(root/'data/app.db') as db:
                counts={table:db.execute('SELECT count(*) FROM '+table).fetchone()[0] for table in ['calendars','calendar_events']}
            assert all(n==0 for n in counts.values()),counts
            result['cases'].append({'start':start,'all_day':all_day,'status':response.status_code,'response':response.json(),'persisted_counts':counts})
        valid=client.post('/api/calendar/events',json={'summary':'Valid boundary control','dtstart':'9999-12-30T23:30:00'})
        assert valid.status_code==200,valid.text
        uid=valid.json()['uid'];saved=client.get('/api/calendar/events/'+uid).json()['event']
        assert saved['dtend']=='9999-12-31T00:30:00',saved
        result['valid_control']={'status':200,'start':saved['dtstart'],'end':saved['dtend']}

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
    (w/'research'/f'pr-7217-overflow-native-{phase}-20261119.json').write_text(json.dumps(result, indent=2)+'\n')
assert not remaining and port_closed
print(json.dumps(result))
