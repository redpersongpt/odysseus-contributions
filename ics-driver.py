import os,sys,json,subprocess,time
from pathlib import Path
from datetime import datetime,date,timedelta,timezone
import httpx,psutil
from icalendar import Calendar,Event
from dateutil.rrule import rrulestr
phase=sys.argv[1];assert phase in {'before','after'}
w=Path('/Users/red/Documents/ChatGPT/ODY');root=w/'.runtime'/('calendar-exdates-20261119-'+phase);root.mkdir(exist_ok=False);(root/'data').mkdir()
source=w/('.runtime/calendar-ics-baseline' if phase=='before' else 'odysseus')
env=dict(os.environ,CALENDAR_EXDATES_ROOT=str(root),CALENDAR_EXDATES_SOURCE=str(source),ODYSSEUS_DATA_DIR=str(root/'data'),DATABASE_URL=f'sqlite:///{root}/data/app.db',AUTH_ENABLED='true',APP_PORT='17868',ODYSSEUS_INTERNAL_BASE='http://127.0.0.1:17868')
log=(w/'research'/f'pr-7197-native-{phase}-app-20261119.log').open('w');p=subprocess.Popen([sys.executable,str(w/'research/calendar-exdates-smoke-app.py')],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
result={'phase':phase,'cases':[],'source':str(source)}
def recurrence_count(raw):
 component=Calendar.from_ical(raw).walk('VEVENT')[0];start=component['DTSTART'].dt
 if isinstance(start,date) and not isinstance(start,datetime):start=datetime.combine(start,datetime.min.time())
 rules=rrulestr(component['RRULE'].to_ical().decode(),dtstart=start,forceset=True)
 props=component.get('EXDATE',[]);props=props if isinstance(props,list) else [props]
 values=[]
 for prop in props:
  for entry in prop.dts:
   value=entry.dt
   if isinstance(value,date) and not isinstance(value,datetime):value=datetime.combine(value,datetime.min.time())
   rules.exdate(value);values.append(value.isoformat())
 return len(list(rules)),values
try:
 with httpx.Client(base_url='http://127.0.0.1:17868',timeout=30,trust_env=False) as c:
  for _ in range(150):
   assert p.poll() is None
   try:
    if c.get('/api/health',timeout=2).status_code==200:break
   except httpx.ConnectError:pass
   time.sleep(.2)
  else:raise AssertionError('app readiness timeout')
  c.post('/api/auth/login',json={'username':'calendar-exdates-smoke','password':(root/'password').read_text()}).raise_for_status()
  def listing(cal):
   r=c.get('/api/calendar/events',params={'calendar':cal,'start':'2026-12-01','end':'2026-12-05'});r.raise_for_status();d=r.json();return d['events'] if isinstance(d,dict) else d
  def imported(raw,name):
   r=c.post('/api/calendar/import',params={'calendar_name':name},files={'file':('owned.ics',raw,'text/calendar')});r.raise_for_status();d=r.json();assert d['imported']==1,d;return d,len(listing(d['calendar_id']))
  for kind in ['all-day','utc','floating','seconds']:
   allday=kind=='all-day';utc=kind in {'utc','seconds'}
   start=date(2026,12,1) if allday else datetime(2026,12,1,10,0,30 if kind=='seconds' else 0,tzinfo=timezone.utc if utc else None)
   end=start+timedelta(days=1) if allday else start+timedelta(hours=1)
   cal=c.post('/api/calendar/calendars',params={'name':'Owned '+kind});cal.raise_for_status();calid=cal.json()['id']
   created=c.post('/api/calendar/events',json={'calendar_href':calid,'summary':'Owned recurrence '+kind,'dtstart':start.isoformat(),'dtend':end.isoformat(),'all_day':allday,'rrule':'FREQ=DAILY;COUNT=3'});created.raise_for_status();uid=created.json()['uid']
   rows=listing(calid);assert len(rows)==3,rows
   removed=c.delete('/api/calendar/events/'+rows[1]['uid'],params={'scope':'occurrence'});removed.raise_for_status();assert len(listing(calid))==2
   export=c.get('/api/calendar/export/'+calid);export.raise_for_status();(root/(kind+'-export.ics')).write_bytes(export.content)
   count,exdates=recurrence_count(export.content);assert count==(3 if phase=='before' else 2),(kind,count,exdates)
   copied,copy_count=imported(export.content,'Owned roundtrip '+kind);assert copy_count==(3 if phase=='before' else 2),(kind,copied,copy_count)
   doc=Calendar();doc.add('prodid','-//Owned EXDATE fixture//EN');doc.add('version','2.0');ve=Event();ve.add('uid','owned-'+kind);ve.add('summary','Owned input '+kind);ve.add('dtstart',start);ve.add('dtend',end);ve.add('rrule',{'FREQ':'DAILY','COUNT':3});ve.add('exdate',start+timedelta(days=1));doc.add_component(ve)
   incoming=doc.to_ical();(root/(kind+'-input.ics')).write_bytes(incoming);assert recurrence_count(incoming)[0]==2
   native,native_count=imported(incoming,'Owned independent '+kind);assert native_count==(3 if phase=='before' else 2),(kind,native,native_count)
   result['cases'].append({'kind':kind,'source_after_delete':2,'export_occurrences':count,'export_exdates':exdates,'roundtrip_occurrences':copy_count,'independent_import_occurrences':native_count,'deleted_exdate':removed.json()['exdate']})
   print(json.dumps(result['cases'][-1]),flush=True)
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
 log.close();result['app_exit']=p.returncode;result['children_left']=[c.pid for c in alive]
 (w/'research'/f'pr-7197-native-{phase}-20261119.json').write_text(json.dumps(result,indent=2))
