#!/usr/bin/env python3
"""Serve Rat King locally and refresh connected pages when source files change."""

from __future__ import annotations

import argparse
import functools
import io
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
IGNORED_DIRECTORIES = {".git", ".agents", ".aws", ".codex", "archive", "__pycache__"}
WATCHED_SUFFIXES = {".html", ".css", ".js"}
RELOAD_PATH = "/__dev/events"
state_condition = threading.Condition()
state_version = ""


def source_signature() -> str:
    entries = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in IGNORED_DIRECTORIES for part in path.relative_to(ROOT).parts):
            continue
        if path.suffix.lower() not in WATCHED_SUFFIXES:
            continue
        try:
            stat = path.stat()
        except OSError:
            continue
        entries.append(f"{path.relative_to(ROOT)}:{stat.st_mtime_ns}:{stat.st_size}")
    return "\n".join(sorted(entries))


def watch_sources() -> None:
    global state_version
    while True:
        time.sleep(0.5)
        current = source_signature()
        with state_condition:
            if current != state_version:
                state_version = current
                state_condition.notify_all()


class LiveReloadHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        if urlsplit(self.path).path == RELOAD_PATH:
            self.send_event_stream()
            return
        super().do_GET()

    def send_head(self):
        path = Path(self.translate_path(self.path))
        if path.is_file() and path.suffix.lower() == ".html":
            content = path.read_bytes()
            reload_script = (
                "<script>(function(){"
                "if(!window.EventSource)return;"
                f"var events=new EventSource('{RELOAD_PATH}');"
                "events.addEventListener('reload',function(){location.reload()});"
                "})();</script>"
            ).encode("utf-8")
            closing_body = b"</body>"
            if closing_body in content.lower():
                index = content.lower().rfind(closing_body)
                content = content[:index] + reload_script + content[index:]
            else:
                content += reload_script

            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(str(path)))
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            return io.BytesIO(content)
        return super().send_head()

    def send_event_stream(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        self.wfile.write(b"retry: 1000\n\n")
        self.wfile.flush()

        with state_condition:
            last_version = state_version
            while True:
                state_condition.wait(timeout=15)
                try:
                    if state_version != last_version:
                        last_version = state_version
                        message = f"event: reload\ndata: {last_version}\n\n".encode("utf-8")
                        self.wfile.write(message)
                    else:
                        self.wfile.write(b": keep-alive\n\n")
                    self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError):
                    return


def main() -> None:
    parser = argparse.ArgumentParser(description="Rat King live preview server")
    parser.add_argument("--port", type=int, default=8000, help="local HTTP port (default: 8000)")
    parser.add_argument("--no-open", action="store_true", help="do not open a browser automatically")
    args = parser.parse_args()

    global state_version
    state_version = source_signature()
    threading.Thread(target=watch_sources, daemon=True).start()

    handler = functools.partial(LiveReloadHandler, directory=str(ROOT))
    address = ("127.0.0.1", args.port)
    try:
        server = ThreadingHTTPServer(address, handler)
    except OSError as error:
        raise SystemExit(f"Kann den lokalen Vorschau-Server nicht starten: {error}") from error

    url = f"http://127.0.0.1:{server.server_port}/RatKing.html"
    print(f"Rat King Live-Vorschau: {url}", flush=True)
    print("Speichere HTML-, CSS- oder JavaScript-Dateien für automatisches Neuladen.", flush=True)
    if not args.no_open:
        threading.Timer(0.5, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nLive-Vorschau beendet.", flush=True)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
