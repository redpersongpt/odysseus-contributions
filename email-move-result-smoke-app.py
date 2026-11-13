"""Actual app, owned synthetic mailbox, built-in email fixture transport."""
import json
import os
from pathlib import Path
import secrets
import sys

root = Path(os.environ['EMAIL_MOVE_ROOT'])
source = Path(os.environ['EMAIL_MOVE_SOURCE'])
sys.path.insert(0, str(source))
from app import app, auth_manager
from core.database import EmailAccount, SessionLocal

owner = 'email-move-results'
password = secrets.token_urlsafe(24)
assert auth_manager.create_user(owner, password, is_admin=True)
p = root/'password'
p.write_text(password)
p.chmod(0o600)
with SessionLocal() as db:
    db.add(EmailAccount(id=owner, owner=owner, name='Local email verification',
                       is_default=True, enabled=True, from_address='me@example.test',
                       imap_host='127.0.0.1', imap_port=9, imap_user='local-only'))
    db.commit()
messages = [{'uid':'9701', 'owner':owner, 'account_id':owner, 'folder':'INBOX',
             'from':'Local Test <sender@example.test>', 'to':'me@example.test',
             'subject':'Email mutation verification', 'body':'Synthetic message for archive and spam verification.',
             'date':'2026-11-13T09:00:00Z', 'read':True}]
(root/'data'/'fixture_email_messages.json').write_text(json.dumps({'messages':messages}))
(root/'initial-messages.json').write_text(json.dumps({'messages':messages}))
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=17871, log_level='warning')
