"""Tiny static server for running the app locally.

    python tools/serve.py [port] [--lan]

--lan binds every network interface instead of just this machine, so a phone on
the same Wi-Fi can open it. Handy for trying the app on a real handset without
hosting it anywhere. It does expose the folder to your local network, so use it
for a test and stop it afterwards.

localhost counts as a secure context, so service workers, offline caching and
"install as app" all work through this server exactly as they would on a real
host.
"""

import http.server
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

args = [a for a in sys.argv[1:] if not a.startswith("-")]
LAN = "--lan" in sys.argv
PORT = int(args[0]) if args else 8137
HOST = "0.0.0.0" if LAN else "127.0.0.1"


def lan_address():
    """Best guess at the address a phone on the same Wi-Fi should open."""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # no packets sent; just picks the route
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


class Handler(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 so the browser can keep connections alive; the threading server
    # below is what makes that safe.
    protocol_version = "HTTP/1.1"

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Always re-check with the server during development; the service
        # worker is what provides real offline caching.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass  # keep the console quiet


if __name__ == "__main__":
    # Must be threaded. A single-threaded server blocks its accept loop on the
    # first idle connection a browser opens speculatively, and every later
    # request - including the ES module imports - then hangs forever.
    class Server(http.server.ThreadingHTTPServer):
        allow_reuse_address = True
        daemon_threads = True

    with Server((HOST, PORT), Handler) as httpd:
        print(f"My English is running at  http://localhost:{PORT}/")
        if LAN:
            print(f"On a phone on the same Wi-Fi:  http://{lan_address()}:{PORT}/")
            print("(Serving to the whole local network - stop it when you are done.)")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
