"""Owned Hugging Face protocol fixture for real hf download CLI, no inference."""
import hashlib,json,threading,time
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse
from pathlib import Path

class HubFixture:
    def __init__(self, root, port=17892, held=True):
        self.root=Path(root);self.root.mkdir(exist_ok=True);self.held=held;self.requests=[]
        self.data=b'GGUF'+bytes(range(256))*1024
        self.digest=hashlib.sha256(self.data).hexdigest();fixture=self
        class Handler(BaseHTTPRequestHandler):
            protocol_version='HTTP/1.1'
            def log_message(self,*args):pass
            def do_HEAD(self):self.respond(False)
            def do_GET(self):self.respond(True)
            def respond(self,body):
                path=urlparse(self.path).path
                fixture.requests.append({'method':self.command,'path':path})
                if path.startswith('/api/models/'):
                    parts=path.split('/');repo='/'.join(parts[3:5]);sha=('a' if repo.endswith('first') else 'b')*40
                    data=json.dumps({'id':repo,'sha':sha,'private':False,'gated':False,'siblings':[{'rfilename':'owned-Q4_K_M.gguf','size':len(fixture.data)}]}).encode()
                    self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers()
                    if body:self.wfile.write(data)
                    return
                if '/resolve/' in path:
                    sha=('a' if '/first/' in path else 'b')*40
                    self.send_response(200);self.send_header('Content-Type','application/octet-stream');self.send_header('Content-Length',str(len(fixture.data)));self.send_header('ETag',fixture.digest);self.send_header('X-Repo-Commit',sha);self.end_headers()
                    if body:
                        if fixture.held and '/first/' in path:
                            (fixture.root/'first-get-started').touch()
                            deadline=time.monotonic()+100
                            while not (fixture.root/'release-first').exists():
                                if time.monotonic()>deadline:raise TimeoutError('owned fixture release timeout')
                                time.sleep(.05)
                        try:self.wfile.write(fixture.data);self.wfile.flush()
                        except (BrokenPipeError,ConnectionResetError):pass
                    return
                data=b'owned fixture has no such path';self.send_response(404);self.send_header('Content-Length',str(len(data)));self.end_headers()
                if body:self.wfile.write(data)
        self.server=ThreadingHTTPServer(('127.0.0.1',port),Handler);self.server.daemon_threads=True
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
    def close(self):
        (self.root/'release-first').touch();self.server.shutdown();self.server.server_close()
        (self.root/'hub-requests.json').write_text(json.dumps(self.requests,indent=2)+'\n')
