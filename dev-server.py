"""Local dev server.

Like `python -m http.server`, but tells the browser never to cache, so edits
to the JS modules show up on a normal refresh instead of needing a hard one.

    python dev-server.py          # http://localhost:5500
    python dev-server.py 8080     # another port
"""
import http.server
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    print(f'Serving on http://localhost:{port}')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
