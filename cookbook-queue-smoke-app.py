"""Real authenticated app; all model download/task/status routes unchanged."""
import os,sys,json,secrets
from pathlib import Path

def main():
    root=Path(os.environ['COOKBOOK_QUEUE_ROOT']);source=Path(os.environ['COOKBOOK_QUEUE_SOURCE']);sys.path.insert(0,str(source))
    from app import app,auth_manager
    import app as app_module
    password=secrets.token_urlsafe(24);assert auth_manager.create_user('cookbook-queue-smoke',password,is_admin=True)
    p=root/'password';p.write_text(password);p.chmod(0o600)
    (root/'provenance.json').write_text(json.dumps({'app_file':app_module.__file__,'source':str(source)}))
    import uvicorn
    uvicorn.run(app,host='127.0.0.1',port=17891,log_level='warning')
if __name__=='__main__':main()
