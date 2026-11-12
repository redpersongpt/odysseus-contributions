"""Actual app startup observer; no client, vector store or route replacement."""
import json,os,secrets,sys
from pathlib import Path
def main():
 root=Path(os.environ['LIFECYCLE_ROOT']);source=Path(os.environ['LIFECYCLE_SOURCE']);sys.path.insert(0,str(source))
 import src.embeddings as embeddings
 pools=[]
 def profile(frame,event,arg):
  if event=='return' and frame.f_code is embeddings.EmbeddingClient.__init__.__code__:
   pools.append(frame.f_locals['self']._client)
 previous=sys.getprofile();sys.setprofile(profile)
 try:
  from app import app,auth_manager
  import app as app_module
 finally:sys.setprofile(previous)
 (root/f'startup-observation-{os.getpid()}.json').write_text(json.dumps({'app_file':app_module.__file__,'embedding_file':embeddings.__file__,'pools_closed':[p.is_closed for p in pools],'down_latch':embeddings._http_embed_down,'rag_available':app_module.rag_available,'observer':'retains actual HTTP pool for inspection; no result replacement'}))
 password=secrets.token_urlsafe(24);assert auth_manager.create_user('lifecycle-smoke',password,is_admin=True)
 p=root/'password';p.write_text(password);p.chmod(0o600)
 import uvicorn
 try:uvicorn.run(app,host='127.0.0.1',port=17881,log_level='warning')
 finally:
  for pool in pools:pool.close()

if __name__=='__main__':
 main()
