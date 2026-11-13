"""Actual app with owned auth/data; no route or dependency replacement."""
import os,secrets,sys,json
from pathlib import Path
root=Path(os.environ['CAL_DRAFT_ROOT']);source=Path(os.environ['CAL_DRAFT_SOURCE'])
sys.path.insert(0,str(source))
from app import app,auth_manager
import app as module
from src.constants import BASE_DIR
(root/'provenance.json').write_text(json.dumps({'app_file':module.__file__,'base_dir':BASE_DIR,'source':str(source)}))
password=secrets.token_urlsafe(24)
assert auth_manager.create_user('calendar-draft-smoke',password,is_admin=True)
p=root/'password';p.write_text(password);p.chmod(0o600)
if __name__=='__main__':
 import uvicorn
 uvicorn.run(app,host='127.0.0.1',port=17871,log_level='warning')
