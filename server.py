#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════
 DIGITAL EXORCIST — Dual Gateway & Static Server
 Serves arcade game frontend and provides real & simulated
 background chore execution (including Spam Mail Exorcism).
═══════════════════════════════════════════════════════════
"""

import sys
import os
import json
import ssl
import imaplib
import email
from email.header import decode_header
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

# Cumulative stats
stats = {
    "emailsDeleted": 0,
    "emailsArchived": 0,
    "filesCleaned": 0,
    "lintFixes": 0,
    "totalChores": 0,
    "bytesFreed": 0,
    "sessionsPlayed": 0
}

def decode_mime_words(s):
    if not s:
        return ""
    decoded_fragments = decode_header(s)
    parts = []
    for fragment, encoding in decoded_fragments:
        if isinstance(fragment, bytes):
            try:
                parts.append(fragment.decode(encoding or "utf-8", errors="replace"))
            except Exception:
                parts.append(fragment.decode("latin1", errors="replace"))
        else:
            parts.append(str(fragment))
    return "".join(parts)

class ExorcistHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for local development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _send_json(self, data, status_code=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == "/api/health":
            return self._send_json({
                "status": "OPERATIONAL",
                "mode": "GATEWAY_ACTIVE",
                "version": "2.0.0",
                "game": "Digital Exorcist",
                "features": ["spam_deletion", "file_cleaning", "lint_fix"]
            })

        if path == "/api/stats":
            return self._send_json({"status": "SUCCESS", "stats": stats})

        if path == "/api/scan/spam":
            email_user = query.get("email", [""])[0]
            password = query.get("password", [""])[0]

            # If user provided Gmail App Password, attempt live IMAP scan
            if email_user and password:
                try:
                    mail = imaplib.IMAP4_SSL("imap.gmail.com")
                    mail.login(email_user, password)
                    # Try spam mailbox names
                    spam_boxes = ['"[Gmail]/Spam"', 'Spam', '"[Gmail]/Junk"']
                    selected = False
                    for box in spam_boxes:
                        try:
                            status_code, _ = mail.select(box)
                            if status_code == 'OK':
                                selected = True
                                break
                        except Exception:
                            continue

                    if not selected:
                        mail.logout()
                        return self._send_json({
                            "status": "ERROR",
                            "message": "Could not locate Spam folder in Gmail"
                        }, 400)

                    status_code, data = mail.search(None, "ALL")
                    msg_ids = data[0].split() if data and data[0] else []
                    count = len(msg_ids)

                    # Fetch a few headers for preview
                    previews = []
                    for mid in msg_ids[-5:]:
                        try:
                            _, msg_data = mail.fetch(mid, "(BODY[HEADER.FIELDS (SUBJECT FROM DATE)])")
                            for response_part in msg_data:
                                if isinstance(response_part, tuple):
                                    msg = email.message_from_bytes(response_part[1])
                                    previews.append({
                                        "id": mid.decode(),
                                        "from": decode_mime_words(msg.get("From")),
                                        "subject": decode_mime_words(msg.get("Subject"))
                                    })
                        except Exception:
                            pass

                    mail.logout()
                    return self._send_json({
                        "status": "LIVE_SUCCESS",
                        "count": count,
                        "folder": "[Gmail]/Spam",
                        "previews": previews,
                        "mode": "LIVE"
                    })
                except Exception as e:
                    return self._send_json({
                        "status": "AUTH_ERROR",
                        "message": str(e),
                        "mode": "ERROR"
                    }, 400)

            # Fallback / Simulation scan
            return self._send_json({
                "status": "SIMULATED",
                "count": 142,
                "mode": "SIMULATION",
                "message": "Connected to simulated spam box. Enter Gmail credentials for live exorcism."
            })

        # Default: Serve static files
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            payload = json.loads(body.decode("utf-8"))
        except Exception:
            payload = {}

        # ── VERIFY EMAIL CREDENTIALS ──────────────────────
        if path == "/api/auth/verify-email":
            email_user = payload.get("email", "")
            password = payload.get("password", "")

            if not email_user or not password:
                return self._send_json({
                    "valid": False,
                    "error": "Email address and App Password are required."
                }, 400)

            try:
                mail = imaplib.IMAP4_SSL("imap.gmail.com")
                mail.login(email_user, password)
                # Count spam
                spam_boxes = ['"[Gmail]/Spam"', 'Spam', '"[Gmail]/Junk"']
                count = 0
                for box in spam_boxes:
                    try:
                        status_code, _ = mail.select(box)
                        if status_code == 'OK':
                            _, data = mail.search(None, "ALL")
                            if data and data[0]:
                                count = len(data[0].split())
                            break
                    except Exception:
                        pass
                mail.logout()

                return self._send_json({
                    "valid": True,
                    "account": email_user,
                    "spamCount": count,
                    "message": f"Successfully connected to Gmail! Found {count} spam messages."
                })
            except Exception as e:
                return self._send_json({
                    "valid": False,
                    "error": f"Gmail connection failed: {str(e)}"
                }, 401)

        # ── DELETE SPAM BATCH ─────────────────────────────
        if path == "/api/chore/delete-spam-batch":
            email_user = payload.get("email", "")
            password = payload.get("password", "")
            action = payload.get("action", "trash")  # 'trash' or 'permanent'
            dry_run = payload.get("dryRun", True)
            count = int(payload.get("count", 1))
            combo = payload.get("comboMultiplier", 1)
            targets = payload.get("targets", [])

            # Live execution if credentials provided and dryRun is false
            if not dry_run and email_user and password:
                try:
                    mail = imaplib.IMAP4_SSL("imap.gmail.com")
                    mail.login(email_user, password)
                    spam_boxes = ['"[Gmail]/Spam"', 'Spam']
                    selected_box = None
                    for box in spam_boxes:
                        try:
                            status_code, _ = mail.select(box)
                            if status_code == 'OK':
                                selected_box = box
                                break
                        except Exception:
                            continue

                    if not selected_box:
                        mail.logout()
                        return self._send_json({"status": "ERROR", "error": "Spam folder not found"}, 400)

                    status_code, data = mail.search(None, "ALL")
                    msg_ids = data[0].split() if data and data[0] else []
                    to_delete = msg_ids[:count]
                    deleted_count = len(to_delete)

                    for mid in to_delete:
                        if action == "permanent":
                            # Mark deleted & expunge
                            mail.store(mid, "+FLAGS", "\\Deleted")
                        else:
                            # Move to Trash
                            try:
                                mail.copy(mid, '"[Gmail]/Trash"')
                                mail.store(mid, "+FLAGS", "\\Deleted")
                            except Exception:
                                mail.store(mid, "+FLAGS", "\\Deleted")

                    mail.expunge()
                    mail.logout()

                    stats["emailsDeleted"] += deleted_count
                    stats["totalChores"] += deleted_count

                    print(f"🗑️ [LIVE SPAM DELETE] {deleted_count} spam emails {action}ed from {email_user} (combo: x{combo})")

                    return self._send_json({
                        "status": "SUCCESS",
                        "action": "SPAM_PURGED_LIVE",
                        "deletedCount": deleted_count,
                        "live": True,
                        "deleteMode": action,
                        "comboMultiplier": combo,
                        "totalDeleted": stats["emailsDeleted"]
                    })
                except Exception as e:
                    print(f"❌ Error deleting spam: {e}")
                    return self._send_json({
                        "status": "ERROR",
                        "error": str(e),
                        "fallback": "simulation"
                    }, 500)

            # Simulation Mode
            sim_count = count if count > 0 else 1
            stats["emailsDeleted"] += sim_count
            stats["totalChores"] += sim_count

            print(f"👻 [SIMULATED SPAM DELETE] {sim_count} spam phantoms exorcised (mode: {action}, combo: x{combo})")

            return self._send_json({
                "status": "SUCCESS",
                "action": "SPAM_PURGED_SIMULATED",
                "deletedCount": sim_count,
                "live": False,
                "simulated": True,
                "deleteMode": action,
                "comboMultiplier": combo,
                "totalDeleted": stats["emailsDeleted"]
            })

        # ── ARCHIVE BATCH ─────────────────────────────────
        if path == "/api/chore/archive-batch":
            count = int(payload.get("count", 1))
            stats["emailsArchived"] += count
            stats["totalChores"] += count
            return self._send_json({
                "status": "SUCCESS",
                "action": "ARCHIVE_BATCH",
                "count": count,
                "totalArchived": stats["emailsArchived"]
            })

        self.send_error(404, "Endpoint not found")

def run():
    print(f"""
  ╔══════════════════════════════════════════════════════╗
  ║     👻 DIGITAL EXORCIST — SPAM EXORCIST GATEWAY v2 👻 ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                      ║
  ║  Game & Gateway running at http://localhost:{PORT}      ║
  ║                                                      ║
  ║  Active Chore Features:                              ║
  ║    ✓ SPAM EMAIL DELETION (Live IMAP + Simulation)    ║
  ║    ✓ ARCHIVE & CLEANUP ORCHESTRATION                 ║
  ║    ✓ REAL-TIME RETRO GAMEPLAY & SFX                  ║
  ║                                                      ║
  ║  Press Ctrl+C to stop                                ║
  ╚══════════════════════════════════════════════════════╝
    """)
    server = HTTPServer(("", PORT), ExorcistHandler)
    server.serve_forever()

if __name__ == "__main__":
    run()
