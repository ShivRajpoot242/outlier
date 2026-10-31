# 👻 Digital Exorcist — Spam Slayer & Chore Gateway v2.0

> **Destroy your digital clutter. One phantom at a time.**

A retro arcade shooter that gamifies digital chores — cleaning spam emails, purging temporary disk clutter, and auto-fixing code lint issues.

---

## 🗑️ New Feature: Spam Mail Deletion

You can now configure the game to **delete or trash real spam emails** when shooting down Red Spam Phantoms:

### How It Works

1. **Target Selection**:
   - Red Phantoms represent incoming spam, junk, and promotional messages.
   - Shooting a phantom triggers a targeted exorcism event.

2. **Exorcism Modes** (Configurable in `Target Config`):
   - 🗑️ **Delete Spam (Move to Trash)** *(Recommended)*: Moves matching spam messages to the Gmail Trash folder.
   - 💥 **Permanent Purge (Expunge)**: Completely removes spam messages permanently.
   - 📦 **Safe Archive**: Marks messages as read and archives them out of your inbox.

3. **Connection Modes**:
   - **Simulation Mode (Practice)**: Generates realistic spam targets (`claims@lottery-winner-intl.xyz`, `urgent-security@paypal-account-verify.net`, etc.) without touching any external accounts.
   - **Live Gmail Exorcism**: Connects via SSL IMAP to your Gmail `[Gmail]/Spam` folder using a standard **Google App Password** (generated under Google Account → Security → 2-Step Verification → App Passwords).

4. **Live Spam Scanner**:
   - Click **"🔍 TEST & SCAN SPAM"** on the settings screen to connect to Gmail and discover how many spam phantoms are lurking in your spam folder.

---

## 🕹️ Controls

| Key | Action |
|-----|--------|
| `←` / `→` or `A` / `D` | Move Exorcist Ship |
| `Space` | Fire Exorcism Blaster |
| `P` or `ESC` | Pause / Resume Mission |
| `Enter` | Start Game from Menu |

---

## 🚀 Running Locally

```bash
# Start the Gateway and Game Server
python3 server.py 8080
```

Open your browser to: **http://localhost:8080**
# outlier
# outlier
