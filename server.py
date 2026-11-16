from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.request import urlopen, Request
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
GOOGLE_ICS_URL = 'https://calendar.google.com/calendar/ical/damrsmurf4@gmail.com/public/basic.ics'

class CalendarProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/calendar.ics':
            try:
                req = Request(GOOGLE_ICS_URL, headers={'User-Agent': 'Mozilla/5.0'})
                with urlopen(req, timeout=20) as response:
                    data = response.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/calendar; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            except Exception as exc:
                body = f'ERROR: {exc}'.encode('utf-8')
                self.send_response(502)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

        if self.path.startswith('/api/'):
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(b'Not found')
            return

        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    os.chdir(ROOT)
    server = ThreadingHTTPServer(('0.0.0.0', 8000), CalendarProxyHandler)
    print('Serving HTTP on http://localhost:8000')
    server.serve_forever()
