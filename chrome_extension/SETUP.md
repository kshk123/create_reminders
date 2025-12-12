# Create Reminders - Setup Guide

This guide will help you set up the Chrome extension with Google Calendar and Apple Reminders integration.

> **GitHub Repository**: [https://github.com/kshk123/create_reminders](https://github.com/kshk123/create_reminders)

---

## Table of Contents

1. [Quick Start (Basic Features Only)](#quick-start-basic-features-only)
2. [Full Setup with Google Calendar](#full-setup-with-google-calendar)
3. [Apple Reminders Integration (macOS only)](#apple-reminders-integration-macos-only)
4. [Troubleshooting](#troubleshooting)

---

## Quick Start (Basic Features Only)

If you just want to capture and manage reminders locally without calendar integrations:

### 1. Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this folder: `/Users/basu/CodeBase/apps/set_reminders`
5. The extension should now appear in your extensions list ✅

### 2. Use Basic Features

- **Right-click on selected text** → "Add to Reminders"
- **Click the extension icon** to view and manage reminders
- **Add reminders manually** using the text input
- **Set due dates/times** for each reminder

**That's it!** The basic features work without any additional setup.

---

## Full Setup with Google Calendar

To enable the "Send to Google Calendar" feature, you need to set up Google OAuth credentials.

### Step 1: Get Your Extension ID

1. Go to `chrome://extensions/`
2. Find "Create Reminders" in the list
3. **Copy the Extension ID** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)
4. Keep this handy - you'll need it in the next steps

### Step 2: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown at the top
4. Click **"New Project"**
5. Enter a project name (e.g., "Reminder Extension")
6. Click **"Create"**
7. Wait for the project to be created, then select it

### Step 3: Enable Google Calendar API

1. In your Google Cloud project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on it
4. Click **"Enable"**
5. Wait for it to be enabled (should take a few seconds)

### Step 4: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**

3. **First-time setup:** You may be prompted to configure the OAuth consent screen
   - Click **"Configure Consent Screen"**
   - User Type: Select **"External"**
   - Click **"Create"**
   - Fill in the required fields:
     - App name: `Create Reminders`
     - User support email: Your email
     - Developer contact: Your email
   - Click **"Save and Continue"**
   - **Scopes:** Click **"Add or Remove Scopes"**
     - Search for: `https://www.googleapis.com/auth/calendar.events`
     - Check the box next to it
     - Click **"Update"** then **"Save and Continue"**
   - **Test users:** Click **"Add Users"**
     - Enter your Gmail address
     - Click **"Add"** then **"Save and Continue"**
   - Click **"Back to Dashboard"**

4. Go back to **"Credentials"** → **"Create Credentials"** → **"OAuth client ID"**
5. Application type: Select **"Chrome Extension"** (or "Chrome App")
6. Name: `Create Reminders`
7. **Item ID:** Paste your Extension ID from Step 1
8. Click **"Create"**

### Step 5: Copy Your Client ID

1. After creation, a dialog will show your **Client ID**
2. It looks like: `123456789-abc123.apps.googleusercontent.com`
3. **Copy this entire Client ID**

### Step 6: Update the Extension

1. Open `manifest.json` in your extension folder
2. Find this section:
   ```json
   "oauth2": {
     "client_id": "YOUR_ACTUAL_CLIENT_ID_HERE.apps.googleusercontent.com",
   ```
3. Replace `YOUR_ACTUAL_CLIENT_ID_HERE.apps.googleusercontent.com` with your actual Client ID
4. Save the file

### Step 7: Reload the Extension

1. Go to `chrome://extensions/`
2. Find "Create Reminders"
3. Click the **refresh/reload icon** (circular arrow)

### Step 8: Test Google Calendar Integration

1. Click the extension icon
2. Add a reminder (or use an existing one)
3. Set a date/time for the reminder
4. Click **"Send to Google Calendar"**
5. You'll be prompted to sign in and authorize the extension
6. After authorization, the event should appear in your Google Calendar! 🎉

---

## Apple Reminders Integration (macOS only)

This feature requires a local Python bridge (distributed separately from the Web Store add-on) to communicate with Apple Reminders.

### Prerequisites

- **macOS** (this feature doesn't work on Windows/Linux)
- **Python 3** (check by running `python3 --version` in Terminal)

### Step 1: Download and start the bridge

1) Download the **Apple bridge bundle** from the GitHub release (`apple-reminders-bridge.zip`).  
2) Start it locally:
```bash
cd /path/to/apple-bridge-bundle
./start-bridge.sh
```

You should see the bridge listening on `http://localhost:19092/reminder` and printing an auth token. The extension fetches the token directly from the running bridge at `http://localhost:19092/token`—no token file ships inside the add-on.

**Keep this terminal window open** while using the extension, or install the launch agent from the bridge bundle to auto-start it on login.

### Step 2: Grant Permissions (First Time Only)

The first time you send a reminder to Apple Reminders:

1. macOS will ask for permission
2. Go to **System Settings** → **Privacy & Security** → **Reminders**
3. Enable access for **Terminal** (or **Python**, depending on how you run it)

### Step 3: Test Apple Reminders Integration

1. Click the extension icon
2. Add a reminder
3. (Optional) Set a date/time
4. Click **"Send to Apple Reminders"**
5. Check the **Reminders app** on your Mac
6. Look for a list called **"Create Reminders"** - your reminder should be there! 🎉

**Important Notes:**
- ⚠️ **Deleting a reminder from the extension does NOT delete it from Apple Reminders**
  - You must manually delete reminders in the Reminders app
  - This is a limitation of the AppleScript API
- 📝 The default list name is "Create Reminders" (you can override per-send in the prompt)
- 🔄 Editing a reminder in the extension doesn't update Apple Reminders
  - Send it again as a new reminder if needed

### Running the Bridge Automatically (Optional)

The bridge bundle includes a launch agent plist and installer script. Use `./install-launchagent.sh install` from the bridge bundle to auto-start it on login, or run `./start-bridge.sh` manually when needed.

---

## Troubleshooting

### Google Calendar Issues

#### "Error: Invalid client"
- Double-check that you copied the Client ID correctly in `manifest.json`
- Make sure there are no extra spaces or quotes
- The Client ID should end with `.apps.googleusercontent.com`

#### "Error: Access blocked: This app's request is invalid"
- Make sure you added your email as a "Test user" in the OAuth consent screen
- Make sure you enabled the Google Calendar API in your Google Cloud project
- Try reloading the extension in Chrome

#### "Error: Network error: Check your internet connection"
- Check your internet connection
- Check if Google Calendar is accessible in your browser
- Try disabling any VPN or proxy

#### "Set a date/time before sending to Google Calendar"
- You must set a date/time for the reminder before sending it to Google Calendar
- Use the datetime picker in each reminder card

### Apple Reminders Issues

#### "Cannot connect to Apple Reminders helper"
- Make sure the bridge is running: `./start-bridge.sh`
- Check that the terminal window is still open
- Try stopping and restarting the bridge

#### "Port 19092 is already in use"
- The bridge might already be running
- The startup script will offer to kill the existing process
- Or manually: `lsof -ti:19092 | xargs kill -9`

#### Reminders not appearing in Apple Reminders app
- Check if the bridge terminal shows any error messages
- Make sure you granted permission in System Settings → Privacy & Security → Reminders
- Check the "Quick Capture" list in the Reminders app
- Try creating the list manually first, then send a reminder

### Extension Issues

#### Extension won't load
- Check for errors in `chrome://extensions/` (click "Details" → "Errors")
- Make sure all files are in the same directory
- Make sure `manifest.json` is valid JSON (no syntax errors)

#### Context menu doesn't appear
- Make sure you have text selected before right-clicking
- Try reloading the extension
- Check that the extension has the necessary permissions

#### Changes not taking effect
- Always reload the extension after making code changes
- Go to `chrome://extensions/` and click the reload icon
- Close and reopen the popup

---

## Extension Features Summary

### ✅ What Works Without Setup
- Capture reminders from selected text
- Add reminders manually
- Set due dates/times
- View and manage all reminders
- Delete individual reminders
- Clear all reminders

### 🔑 Requires Google OAuth Setup
- Send reminders to Google Calendar

### 🍎 Requires Apple Bridge
- Send reminders to Apple Reminders (macOS only)

---

## Support

If you run into issues not covered here:

1. Check the browser console: Right-click the extension popup → "Inspect"
2. Check the extension service worker: `chrome://extensions/` → "Inspect views: service worker"
3. Check the bridge terminal output for errors

---

## Privacy & Security

- **Local Storage**: All reminders are stored locally in your browser
- **Google Calendar**: Uses official Google OAuth 2.0 - your credentials are never stored
- **Apple Reminders**: The bridge runs locally on your machine - no data leaves your computer
- **Permissions**: The extension only requests necessary permissions (storage, context menus, activeTab)

---

**Happy organizing!** 🎉
