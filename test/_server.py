# Static HTTP server for the multi-file build (ES/classic scripts and assets need http://, not file://).
# Importing this module starts a server on a free port in a background thread; BASE is its root URL.
import http.server,threading,functools,os,socketserver
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store'); super().end_headers()
class S(socketserver.ThreadingMixIn,http.server.HTTPServer): daemon_threads=True; allow_reuse_address=True
_srv=S(('127.0.0.1',int(os.environ.get('TT_PORT','0'))),functools.partial(Q,directory=ROOT))
threading.Thread(target=_srv.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{_srv.server_address[1]}/'
URL=BASE+'index.html'
