"""Real app + owned OpenAI-compatible response fixture; no model inference."""
import json
import os
from pathlib import Path
import secrets
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

root = Path(os.environ['SIDEBAR_SWIPE_ROOT'])
source = Path(os.environ['SIDEBAR_SWIPE_SOURCE'])
sys.path.insert(0, str(source))
answer = 'Owned selectable assistant response. Copy this sentence without opening the sidebar drawer.\n\nA deliberate edge swipe still opens the navigation drawer.\n\nEnd of owned response.'
(root/'answer.txt').write_text(answer)
class Provider(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def reply(self, payload, kind='application/json'):
        if not isinstance(payload, bytes): payload=json.dumps(payload).encode()
        self.send_response(200);self.send_header('Content-Type',kind)
        self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
    def do_GET(self): self.reply({'data':[{'id':'fixture-swipe','object':'model'}]})
    def do_POST(self):
        data=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))))
        with (root/'provider-capture.jsonl').open('a') as f: f.write(json.dumps(data)+'\n')
        if data.get('stream'):
            parts=[answer]
            frames=[('data: '+json.dumps({'choices':[{'delta':{'content':part},'finish_reason':None}]})+'\n\n').encode() for part in parts]
            frames.append(b'data: [DONE]\n\n')
            self.send_response(200);self.send_header('Content-Type','text/event-stream');self.send_header('Content-Length',str(sum(map(len,frames))));self.end_headers()
            for frame in frames:
                self.wfile.write(frame);self.wfile.flush();time.sleep(.2)

        else:self.reply({'choices':[{'message':{'role':'assistant','content':answer},'finish_reason':'stop'}],'usage':{'prompt_tokens':30,'completion_tokens':40,'total_tokens':70}})
provider=ThreadingHTTPServer(('127.0.0.1',17872),Provider)
threading.Thread(target=provider.serve_forever,daemon=True).start()
from app import app, auth_manager
from core.database import SessionLocal, ModelEndpoint
import app as app_module
from src.constants import BASE_DIR
(root/'provenance.json').write_text(json.dumps({'app_file':app_module.__file__,'base_dir':BASE_DIR,'requested_source':str(source)}))
password=secrets.token_urlsafe(24)
assert auth_manager.create_user('sidebar-swipe-smoke',password,is_admin=True)
p=root/'password';p.write_text(password);p.chmod(0o600)
with SessionLocal() as db:
    db.add(ModelEndpoint(id='sidebar-swipe-fixture',name='Owned sidebar gesture response',owner='sidebar-swipe-smoke',base_url='http://127.0.0.1:17872/v1',is_enabled=True,supports_tools=False,model_refresh_mode='manual',cached_models='["fixture-swipe"]',pinned_models='["fixture-swipe"]',hidden_models='[]'))
    db.commit()
if __name__=='__main__':
    import uvicorn
    try: uvicorn.run(app,host='127.0.0.1',port=17871,log_level='warning')
    finally: provider.shutdown();provider.server_close()
