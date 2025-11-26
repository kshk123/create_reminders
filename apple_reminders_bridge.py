#!/usr/bin/env python3
"""
Lightweight local HTTP bridge to add reminders to Apple Reminders.

Run: python apple_reminders_bridge.py
It starts http://localhost:19092/reminder and expects POST JSON:
{
  "text": "Reminder text",
  "dueAt": "2024-02-02T10:00:00.000Z",  # optional ISO datetime
  "sourceUrl": "...",
  "sourceTitle": "..."
}
"""

import json
import subprocess
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
import secrets
import os
from pathlib import Path

PORT = 19092
# Generate a random token on startup for basic security
# This prevents random websites from accessing the bridge
AUTH_TOKEN = secrets.token_urlsafe(32)
# Maximum length for reminder text and notes to prevent abuse
MAX_TEXT_LENGTH = 1000
MAX_NOTES_LENGTH = 2000
# Default list name for reminders
DEFAULT_LIST_NAME = "Create Reminders"


def sanitize_applescript_string(s: str, max_length: int) -> str:
    """
    Sanitize and escape strings for AppleScript to prevent injection.
    Removes control characters, newlines, and limits length.
    """
    if not s:
        return ""
    
    # Limit length
    s = s[:max_length]
    
    # Remove control characters and potentially dangerous chars
    # Keep only printable ASCII and common unicode, remove newlines, tabs, etc.
    sanitized = "".join(char for char in s if char.isprintable() or char == " ")
    
    # Remove any remaining newlines, carriage returns, backticks
    sanitized = sanitized.replace("\n", " ").replace("\r", " ").replace("`", "'")
    
    # Escape double quotes and backslashes for AppleScript
    sanitized = sanitized.replace("\\", "\\\\").replace('"', '\\"')
    
    return sanitized


def _parse_due(iso_value: str):
    if not iso_value:
        return ""
    try:
        normalized = iso_value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        local_dt = dt.astimezone()
        return local_dt.strftime("%m/%d/%Y %H:%M")
    except Exception:
        return ""


def add_reminder(title: str, notes: str, due_at: str, list_name: str = None):
    # Sanitize inputs to prevent AppleScript injection
    safe_title = sanitize_applescript_string(title, MAX_TEXT_LENGTH)
    safe_notes = sanitize_applescript_string(notes, MAX_NOTES_LENGTH)
    safe_due_at = sanitize_applescript_string(due_at, 50)  # Date format is short
    safe_list_name = sanitize_applescript_string(list_name or DEFAULT_LIST_NAME, 100)
    
    if not safe_title:
        safe_title = "Reminder"
    
    due_clause = ""
    if safe_due_at:
        due_clause = f'set remind me date of theReminder to date "{safe_due_at}"\n'

    script = f'''
      set reminderName to "{safe_title}"
      set reminderNotes to "{safe_notes}"
      set listName to "{safe_list_name}"
      tell application "Reminders"
        if (not (exists list listName)) then
          make new list with properties {{name:listName}}
        end if
        set theList to list listName
        set theReminder to make new reminder at end of theList with properties {{name:reminderName, body:reminderNotes}}
        {due_clause}
      end tell
    '''
    return subprocess.run(["osascript", "-e", script], capture_output=True, text=True)


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        # Removed wildcard CORS - only localhost can access anyway
        # Extension uses X-Auth-Token header for authentication
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        # CORS preflight for extension
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "chrome-extension://*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Auth-Token")
        self.end_headers()

    def do_POST(self):
        if self.path != "/reminder":
            self._send(404, {"error": "Not found"})
            return

        # Check for authorization header
        auth_header = self.headers.get("X-Auth-Token")
        if auth_header != AUTH_TOKEN:
            self._send(403, {"error": "Unauthorized"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            data = json.loads(raw or "{}")
        except Exception:
            self._send(400, {"error": "Invalid JSON"})
            return

        text = data.get("text") or "Reminder"
        due_at = _parse_due(data.get("dueAt") or "")
        list_name = data.get("listName") or DEFAULT_LIST_NAME
        
        # Validate input lengths
        if len(text) > MAX_TEXT_LENGTH:
            self._send(400, {"error": f"Text too long (max {MAX_TEXT_LENGTH} chars)"})
            return
        
        notes_parts = []
        if data.get("sourceTitle"):
            notes_parts.append(data["sourceTitle"])
        if data.get("sourceUrl"):
            notes_parts.append(data["sourceUrl"])
        notes = " — ".join(notes_parts) if notes_parts else ""
        
        if len(notes) > MAX_NOTES_LENGTH:
            self._send(400, {"error": f"Notes too long (max {MAX_NOTES_LENGTH} chars)"})
            return

        proc = add_reminder(text, notes, due_at, list_name)
        if proc.returncode != 0:
            self._send(500, {"error": proc.stderr.strip() or "AppleScript failed"})
            return

        self._send(200, {"ok": True})


def main():
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    config_file = script_dir / "bridge_config.json"
    
    # Write the auth token to the config file
    try:
        config = {"auth_token": AUTH_TOKEN}
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)
        print(f"✓ Token written to {config_file}")
    except Exception as e:
        print(f"⚠ Warning: Could not write token to config file: {e}")
        print("  Extension will need manual token setup.")
    
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    print("=" * 60)
    print("Apple Reminders Bridge - SECURITY NOTICE")
    print("=" * 60)
    print(f"Bridge running on: http://localhost:{PORT}/reminder")
    print(f"Auth Token: {AUTH_TOKEN}")
    print()
    print("SETUP:")
    print("✓ Token automatically saved to bridge_config.json")
    print("✓ Extension will auto-read the token - no manual copy needed!")
    print()
    print("SECURITY:")
    print("- Only run this bridge when needed")
    print("- Stop the bridge when not in use (Ctrl+C)")
    print("- Token changes each restart for security")
    print("- Bridge only accepts connections from localhost")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
