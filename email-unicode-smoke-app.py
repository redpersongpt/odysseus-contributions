"""Actual app with an isolated authenticated GreenMail account; no model."""
import os
import secrets
import sys
from pathlib import Path

root = Path(os.environ['EMAIL_UNICODE_ROOT'])
sys.path.insert(0, os.environ['EMAIL_UNICODE_SOURCE'])
from app import app, auth_manager
from core.database import SessionLocal, EmailAccount
from src.secret_storage import encrypt

password = secrets.token_urlsafe(24)
assert auth_manager.create_user('email-unicode-smoke', password, is_admin=True)
path = root / 'password'
path.write_text(password)
path.chmod(0o600)
with SessionLocal() as db:
    db.add(EmailAccount(id='owned-unicode-mail', owner='email-unicode-smoke',
        name='Owned Unicode mailbox', enabled=True, imap_host='127.0.0.1',
        imap_port=17869, imap_starttls=False, imap_user='fixture',
        imap_password=encrypt('fixture')))
    db.commit()

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=17868, log_level='warning')
