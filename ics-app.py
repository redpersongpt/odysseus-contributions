import os,secrets,sys
from pathlib import Path
root=Path(os.environ['CALENDAR_EXDATES_ROOT']);sys.path.insert(0,os.environ['CALENDAR_EXDATES_SOURCE'])
from app import app,auth_manager
password=secrets.token_urlsafe(24);assert auth_manager.create_user('calendar-exdates-smoke',password,is_admin=True)
p=root/'password';p.write_text(password);p.chmod(0o600)
if __name__=='__main__':
 import uvicorn
 uvicorn.run(app,host='127.0.0.1',port=17868,log_level='warning')
