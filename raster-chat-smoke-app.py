"""Real app + owned OpenAI-compatible response fixture; no model inference."""
import base64
import json
import os
from pathlib import Path
import secrets
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

root = Path(os.environ['RASTER_CHAT_ROOT'])
source = Path(os.environ['RASTER_CHAT_SOURCE'])
sys.path.insert(0, str(source))
encoded = base64.b64encode((source/'static/icons/icon-512.png').read_bytes()).decode()
answer = 'Owned synthetic raster response.\n\n![Owned raster fixture](data:image/png;base64,'+encoded+')\n\nEnd of owned response.'
(root/'answer.txt').write_text(answer)
class Provider(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def reply(self, payload, kind='application/json'):
        if not isinstance(payload, bytes): payload=json.dumps(payload).encode()
        self.send_response(200);self.send_header('Content-Type',kind)
        self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
    def do_GET(self): self.reply({'data':[{'id':'fixture-raster','object':'model'}]})
    def do_POST(self):
        data=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))))
        with (root/'provider-capture.jsonl').open('a') as f: f.write(json.dumps(data)+'\n')
        if data.get('stream'):
            midpoint=len(answer)//2
            chunks=[{'choices':[{'delta':{'content':part},'finish_reason':None}]} for part in [answer[:midpoint],answer[midpoint:]]]
            chunks.append({'choices':[{'delta':{},'finish_reason':'stop'}]})
            self.reply((''.join('data: '+json.dumps(c)+'\n\n' for c in chunks)+'data: [DONE]\n\n').encode(),'text/event-stream')
        else:self.reply({'choices':[{'message':{'role':'assistant','content':answer},'finish_reason':'stop'}],'usage':{'prompt_tokens':30,'completion_tokens':40,'total_tokens':70}})
provider=ThreadingHTTPServer(('127.0.0.1',17872),Provider)
threading.Thread(target=provider.serve_forever,daemon=True).start()
from app import app, auth_manager
from core.database import SessionLocal, ModelEndpoint
import app as app_module
from src.constants import BASE_DIR
(root/'provenance.json').write_text(json.dumps({'app_file':app_module.__file__,'base_dir':BASE_DIR,'requested_source':str(source)}))
password=secrets.token_urlsafe(24)
assert auth_manager.create_user('raster-chat-smoke',password,is_admin=True)
p=root/'password';p.write_text(password);p.chmod(0o600)
with SessionLocal() as db:
    db.add(ModelEndpoint(id='raster-fixture',name='Owned raster response',owner='raster-chat-smoke',base_url='http://127.0.0.1:17872/v1',is_enabled=True,supports_tools=False,model_refresh_mode='manual',cached_models='["fixture-raster"]',pinned_models='["fixture-raster"]',hidden_models='[]'))
    db.commit()
if __name__=='__main__':
    import uvicorn
    try: uvicorn.run(app,host='127.0.0.1',port=17871,log_level='warning')
    finally: provider.shutdown();provider.server_close()
