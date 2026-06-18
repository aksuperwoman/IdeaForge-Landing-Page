#!/usr/bin/env python3
"""
IdeaForge local proxy — run this, then open ideaforge.html
Forwards requests from browser → NVIDIA NIM (bypasses CORS)
Usage: python proxy.py YOUR_NVAPI_KEY
"""
import sys, json, urllib.request, urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

API_KEY = sys.argv[1] if len(sys.argv) > 1 else ""
NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
PORT = 5000

class Proxy(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[proxy] {fmt % args}")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self.send_response(404); self.end_headers(); return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        req = urllib.request.Request(
            NIM_URL,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
        except urllib.error.HTTPError as e:
            err = e.read()
            self.send_response(e.code)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(err)
        except Exception as e:
            self.send_response(502)
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error":{"message":str(e)}}).encode())

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        # FIXED: Added X-Source to the allowed headers list below
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Source")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

if __name__ == "__main__":
    if not API_KEY:
        print("Usage: python proxy.py nvapi-YOUR_KEY_HERE")
        sys.exit(1)
    print(f"✓ IdeaForge proxy running on http://localhost:{PORT}")
    print(f"✓ Forwarding to NVIDIA NIM")
    print(f"  Open ideaforge.html in your browser")
    print(f"  Press Ctrl+C to stop\n")
    HTTPServer(("localhost", PORT), Proxy).serve_forever()