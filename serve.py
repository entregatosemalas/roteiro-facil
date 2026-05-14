import os, sys
os.chdir('/Users/imoto/Documents/GitHub/roteiro-facil')
port = int(os.environ.get('PORT', 8899))
import http.server, socketserver
handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", port), handler) as httpd:
    httpd.serve_forever()
