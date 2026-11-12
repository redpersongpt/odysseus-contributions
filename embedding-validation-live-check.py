"""Real app/ChromaDB/embedding HTTP checks for response-validation diagnostics."""
import json,os,subprocess,sys,threading,time
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import httpx,psutil,chromadb
w=Path('/Users/red/Documents/ChatGPT/ODY');phase=sys.argv[1];assert phase in {'before','after'}
source=w/('.runtime/calendar-ics-baseline' if phase=='before' else 'odysseus');root=w/'.runtime'/('embedding-validation-'+phase);root.mkdir(exist_ok=False)
active=set();lock=threading.Lock();requests=[]
class Provider(BaseHTTPRequestHandler):
 protocol_version='HTTP/1.1'
 def log_message(self,*a):pass
 def setup(self):
  super().setup()
  with lock:active.add(id(self))
 def finish(self):
  try:super().finish()
  finally:
   with lock:active.discard(id(self))
 def do_POST(self):
  data=json.loads(self.rfile.read(int(self.headers['Content-Length'])));requests.append({'path':self.path,'model':data['model'],'inputs':len(data['input'])})
  bad=self.path=='/missing' or (self.path=='/late' and data['input']!=['hello'])
  out={'data':[]} if self.path=='/empty' else {'data':[{}]} if bad else {'data':[{'index':i,'embedding':[3.0,4.0]} for i,_ in enumerate(data['input'])]}
  b=json.dumps(out).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b);self.wfile.flush()
provider=ThreadingHTTPServer(('127.0.0.1',17882),Provider);provider.daemon_threads=True;threading.Thread(target=provider.serve_forever,daemon=True).start()
chroma=chromadb.HttpClient(host='127.0.0.1',port=17883);heartbeat=chroma.heartbeat();cases=[]
try:
 for mode in ['missing','empty','late','valid']:
  for c in chroma.list_collections():chroma.delete_collection(c.name)
  case=root/mode;case.mkdir();(case/'data').mkdir()
  env=dict(os.environ,LIFECYCLE_ROOT=str(case),LIFECYCLE_SOURCE=str(source),ODYSSEUS_DATA_DIR=str(case/'data'),DATABASE_URL=f'sqlite:///{case}/data/app.db',AUTH_ENABLED='true',APP_PORT='17881',ODYSSEUS_INTERNAL_BASE='http://127.0.0.1:17881',EMBEDDING_URL='http://127.0.0.1:17882/'+mode,EMBEDDING_MODEL='owned-lifecycle',CHROMADB_HOST='127.0.0.1',CHROMADB_PORT='17883',ODYSSEUS_TOOL_INDEX_PREWARM='0',ANONYMIZED_TELEMETRY='FALSE')
  log=(w/'research'/f'embedding-validation-{phase}-{mode}-app.log').open('w');p=subprocess.Popen([sys.executable,str(w/'research/embedding-lifecycle-smoke-app.py')],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
  try:
   for _ in range(150):
    assert p.poll() is None,'app exited'
    try:
     if httpx.get('http://127.0.0.1:17881/api/health',timeout=2).status_code==200:break
    except httpx.ConnectError:pass
    time.sleep(.2)
   else:raise AssertionError('app readiness timeout')
   time.sleep(.1);startup=json.loads((case/f'startup-observation-{p.pid}.json').read_text());assert len(startup['pools_closed'])==(1 if mode in {'missing','empty'} else 2),startup
   expected_closed=False;assert startup['pools_closed']==[expected_closed]*len(startup['pools_closed']),startup
   assert startup['rag_available']==(mode in {'valid','late'}),startup
   with lock:connections=len(active)
   assert connections==(0 if expected_closed else len(startup['pools_closed'])),(mode,connections,startup)
   with httpx.Client(base_url='http://127.0.0.1:17881',timeout=30) as web:
    login=web.post('/api/auth/login',json={'username':'lifecycle-smoke','password':(case/'password').read_text()});assert login.status_code==200
    upload=web.post('/api/personal/upload',files={'files':('owned-lifecycle.txt',f'Owned lifecycle {phase} {mode} document.', 'text/plain')})
    assert upload.status_code==(200 if mode in {'valid','late'} else 503),(upload.status_code,upload.text)
    if mode in {'valid','late'}:
     assert upload.json()['indexed_count']==(1 if mode=='valid' else 0) and upload.json()['failed_count']==(0 if mode=='valid' else 1),upload.text
   log.flush();log_text=(w/'research'/f'embedding-validation-{phase}-{mode}-app.log').read_text()
   diagnostic=[line for line in log_text.splitlines() if ('HTTP embedding API unavailable' in line or 'add_document failed' in line)]
   if mode!='valid':
    assert diagnostic,(mode,log_text[-3000:])
    if phase=='after':assert any('Invalid embedding API response' in line and 'owned-lifecycle' in line and 'http://127.0.0.1:17882/' in line for line in diagnostic),diagnostic
    else:assert all('Invalid embedding API response' not in line for line in diagnostic),diagnostic
   collection_names={c.name for c in chroma.list_collections()}
   rows=chroma.get_collection('odysseus_rag_custom').count() if 'odysseus_rag_custom' in collection_names else 0
   assert rows==(1 if mode=='valid' else 0),(mode,rows)
   cases.append({'rag_collection_rows':rows,'diagnostic':diagnostic,'mode':mode,'startup':startup,'provider_connections_after_startup':connections,'upload_status':upload.status_code,'upload_result':upload.json()})
  finally:
   children=psutil.Process(p.pid).children(recursive=True) if p.poll() is None else [];p.terminate()
   try:p.wait(timeout=20)
   except subprocess.TimeoutExpired:p.kill();p.wait(timeout=5)
   for child in children:
    try:child.terminate()
    except psutil.NoSuchProcess:pass
   _,alive=psutil.wait_procs(children,timeout=5)
   for child in alive:child.kill()
   _,left=psutil.wait_procs(alive,timeout=5);log.close()
   (case/'shutdown.json').write_text(json.dumps({'app_exit':p.returncode,'children_left':[c.pid for c in left]}));assert not left
  for _ in range(40):
   with lock:remaining=len(active)
   if not remaining:break
   time.sleep(.05)
  assert remaining==0,'owned provider connection remained after app shutdown'
 result={'phase':phase,'chroma_version':chromadb.__version__,'chroma_heartbeat':heartbeat,'cases':cases,'requests':requests,'provider_connections_after_apps':remaining}
 (w/'research'/f'embedding-validation-{phase}-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
finally:
 for c in chroma.list_collections():chroma.delete_collection(c.name)
 provider.shutdown();provider.server_close()
