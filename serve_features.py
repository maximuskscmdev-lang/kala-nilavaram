import http.server
import socketserver
import os

FILE = "/root/kala-nilavaram/USER_ACTIONS_AND_FEATURES.md"
PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/USER_ACTIONS_AND_FEATURES.md"):
            try:
                with open(FILE, "rb") as f:
                    data = f.read()
            except FileNotFoundError:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/markdown; charset=utf-8")
            self.send_header("Content-Disposition",
                             'attachment; filename="USER_ACTIONS_AND_FEATURES.md"')
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_error(404)

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Serving {FILE} on port {PORT}")
    httpd.serve_forever()
