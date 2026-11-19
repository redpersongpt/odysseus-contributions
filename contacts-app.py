import json,os,secrets,sys
from pathlib import Path
root=Path(os.environ['CONTACTS_FAILURE_ROOT']);root.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,os.environ['CONTACTS_FAILURE_SOURCE'])
from src import constants
owned=root/'owned contacts';owned.mkdir(exist_ok=True);owned.chmod(0o755)
# Put only the actual contacts file in a separately permission-controlled folder.
constants.CONTACTS_FILE=str(owned/'contacts.json')
from app import app,auth_manager
from routes.contacts import contacts_routes
p=root/'password'
if not p.exists():
 password=secrets.token_urlsafe(24);assert auth_manager.create_user('contacts-failure-smoke',password,is_admin=True);p.write_text(password);p.chmod(0o600)
if not (owned/'contacts.json').exists():
 assert contacts_routes._create_contact('Owned contact','owned@example.invalid',phones=['5550100'],owner='contacts-failure-smoke')
(root/'initial-contacts.json').write_bytes((owned/'contacts.json').read_bytes())
if __name__=='__main__':
 import uvicorn
 uvicorn.run(app,host='127.0.0.1',port=17836,log_level='warning')
