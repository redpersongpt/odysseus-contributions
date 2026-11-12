"""Actual native Cookbook app + real hf CLI + private real tmux socket."""
import importlib.util,json,os,subprocess,sys,time,hashlib
from pathlib import Path
import httpx,psutil
w=Path('/Users/red/Documents/ChatGPT/ODY');phase,viewport=sys.argv[1:];assert phase in {'before','after'} and viewport in {'desktop','mobile'}
root=w/'.runtime'/f'cookbook-queue-{phase}-{viewport}';root.mkdir(exist_ok=False);(root/'data').mkdir();(root/'tmp').mkdir();(w/'research/evidence-cookbook-queue').mkdir(exist_ok=True)
source=w/('.runtime/calendar-ics-baseline' if phase=='before' else 'odysseus');tools=w/'.runtime/pr087-tools';wrappers=tools/'wrappers';wrappers.mkdir(exist_ok=True)
wrapper=wrappers/'tmux';wrapper.write_text('#!/bin/sh\n: "${ODY_COOKBOOK_TMUX_SOCKET:?owned test socket required}"\nexec '+str(tools/'prefix/bin/tmux')+' -S "$ODY_COOKBOOK_TMUX_SOCKET" "$@"\n');wrapper.chmod(0o755)
spec=importlib.util.spec_from_file_location('owned_hub',w/'research/cookbook-queue-hf-fixture.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);hub=m.HubFixture(root)
socket=str(root/'tmux.sock');env=dict(os.environ,COOKBOOK_QUEUE_ROOT=str(root),COOKBOOK_QUEUE_SOURCE=str(source),ODYSSEUS_DATA_DIR=str(root/'data'),DATABASE_URL=f'sqlite:///{root}/data/app.db',TMPDIR=str(root/'tmp'),AUTH_ENABLED='true',APP_PORT='17891',ODYSSEUS_INTERNAL_BASE='http://127.0.0.1:17891',ODYSSEUS_TOOL_INDEX_PREWARM='0',ODY_COOKBOOK_TMUX_SOCKET=socket,HF_HOME=str(root/'hf-cache'),HF_ENDPOINT='http://127.0.0.1:17892',HF_HUB_DISABLE_XET='1',HF_HUB_DISABLE_IMPLICIT_TOKEN='1',HF_HUB_ENABLE_HF_TRANSFER='0',HF_HUB_DOWNLOAD_TIMEOUT='120',HF_TOKEN='',PYTHONPATH=str(w/'.runtime/pr087-download-deps'),PATH=os.pathsep.join([str(w/'.venv/bin'),str(wrappers),str(w/'.runtime/pr087-download-deps/bin'),os.environ['PATH']]))
log=(w/'research'/f'cookbook-queue-{phase}-{viewport}-app.log').open('w');p=subprocess.Popen([sys.executable,str(w/'research/cookbook-queue-smoke-app.py')],cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
try:
 for _ in range(150):
  assert p.poll() is None,'app exited'
  try:
   if httpx.get('http://127.0.0.1:17891/api/health',timeout=2).status_code==200:break
  except httpx.ConnectError:pass
  time.sleep(.2)
 else:raise AssertionError('app readiness timeout')
 subprocess.run(['node',str(w/'research/cookbook-queue-browser.cjs'),phase,viewport],cwd=w/'odysseus',env=env,check=True,timeout=170)
 for _ in range(100):
  files=list((root/'hf-cache').glob('hub/models--owned--*/snapshots/*/*.gguf'))
  if len(files)==(2 if phase=='after' else 1) and all(hashlib.sha256(x.read_bytes()).hexdigest()==hub.digest for x in files):break
  time.sleep(.2)
 else:raise AssertionError('owned artifact download did not complete')
 result=json.loads((root/'browser-result.json').read_text());result.update({'artifact_count':len(files),'artifact_sha256':hub.digest,'artifact_size':len(hub.data),'hub_requests':hub.requests,'provenance':json.loads((root/'provenance.json').read_text())})
 (w/'research'/f'cookbook-queue-{phase}-{viewport}-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['phase','viewport','observed_pending_status','artifact_count']}))
finally:
 (root/'release-first').touch();subprocess.run([str(tools/'prefix/bin/tmux'),'-S',socket,'kill-server'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 children=psutil.Process(p.pid).children(recursive=True) if p.poll() is None else [];p.terminate()
 try:p.wait(timeout=20)
 except subprocess.TimeoutExpired:p.kill();p.wait(timeout=5)
 for child in children:
  try:child.terminate()
  except psutil.NoSuchProcess:pass
 _,alive=psutil.wait_procs(children,timeout=5)
 for child in alive:child.kill()
 _,left=psutil.wait_procs(alive,timeout=5);log.close();hub.close()
 (root/'shutdown.json').write_text(json.dumps({'app_exit':p.returncode,'children_left':[c.pid for c in left]}))
