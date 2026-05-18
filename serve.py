#!/usr/bin/env python3
import http.server
import socketserver
PORT = 8080
class WasmHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Permettre le Cross-Origin pour les ressources partagées (sécurité CORS)
        self.send_header('Access-Control-Allow-Origin', '*')
        # Désactiver le cache pour charger directement les modifications JS
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
# Associer explicitement les bonnes extensions aux bons types de contenu
WasmHandler.extensions_map.update({
    ".wasm": "application/wasm",
    ".js": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
})
print(f"🚀 Client Server running at http://localhost:{PORT}")
with socketserver.TCPServer(("", PORT), WasmHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped.")