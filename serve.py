#!/usr/bin/env python3
"""Статический сервер собранного PWA (dist/) для Tailscale Funnel.

Funnel монтирует путь /pwa → 127.0.0.1:8180, префикс НЕ срезается, поэтому
сервер сам отбрасывает /pwa перед поиском файла. Правильные MIME для
manifest/sw, Service-Worker-Allowed и no-cache на sw.js/index.html, чтобы
обновления доезжали сразу; хэшированные ассеты кешируются на год.
"""
from __future__ import annotations

import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.environ.get("PWA_DIST", os.path.join(HERE, "dist"))
PREFIX = os.environ.get("PWA_PREFIX", "/pwa").rstrip("/")
HOST = os.environ.get("PWA_HOST", "127.0.0.1")
PORT = int(os.environ.get("PWA_PORT", "8180"))


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".json": "application/json",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".woff2": "font/woff2",
    }
    timeout = 15

    def translate_path(self, path: str) -> str:
        path = path.split("?", 1)[0].split("#", 1)[0]
        if PREFIX and (path == PREFIX or path.startswith(PREFIX + "/")):
            path = path[len(PREFIX):] or "/"
        if path.endswith("/"):
            path += "index.html"
        full = super().translate_path(path)
        # SPA-фолбэк: неизвестный путь без расширения → index.html
        if not os.path.exists(full) and "." not in os.path.basename(path):
            return os.path.join(DIST, "index.html")
        return full

    def end_headers(self) -> None:
        p = self.path.split("?", 1)[0]
        name = os.path.basename(p)
        if name in ("sw.js", "index.html", "manifest.webmanifest") or p.endswith("/"):
            self.send_header("Cache-Control", "no-cache")
        elif "/assets/" in p:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        if name == "sw.js":
            self.send_header("Service-Worker-Allowed", PREFIX + "/")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:  # noqa: ANN002
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


def main() -> None:
    if not os.path.isdir(DIST):
        sys.exit(f"dist not found: {DIST} — run `pnpm build` first")
    srv = ThreadingHTTPServer((HOST, PORT), partial(Handler, directory=DIST))
    srv.daemon_threads = True
    print(f"crash-lab pwa: http://{HOST}:{PORT}{PREFIX}/ ← {DIST}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
