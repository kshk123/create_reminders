# 📝 Craete Reminders

> A Chrome extension to capture reminders from any webpage and sync them to Google Calendar or Apple Reminders.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-Apple%20Reminders-black?logo=apple)](https://www.apple.com/reminders/)
[![Google Calendar](https://img.shields.io/badge/Google-Calendar-green?logo=google-calendar)](https://calendar.google.com/)

![Extension Demo](https://via.placeholder.com/800x400/2563eb/ffffff?text=Quick+Reminder+Capture+Demo)
<!-- TODO: Replace with actual screenshot -->

## ✨ Features

- 🔍 **Capture from any webpage** - Right-click selected text to save as a reminder
- 📅 **Set due dates/times** - Add datetime to any reminder with built-in picker
- 📆 **Google Calendar sync** - Send reminders directly to your Google Calendar
- 🍎 **Apple Reminders integration** - macOS users can sync to native Reminders app
- 💾 **Local storage** - All data stays private in your browser
- 🎨 **Modern UI** - Clean, intuitive interface with toast notifications
- 🔔 **Status indicators** - Know when services are connected
- ⚡ **Zero dependencies** - Pure JavaScript, no frameworks needed

## 📖 Documentation

**For detailed setup instructions, see [SETUP.md](SETUP.md)**

The setup guide includes:
- Step-by-step Google OAuth configuration
- Apple Reminders bridge setup for macOS
- Troubleshooting common issues
- Feature overview and usage tips

## 🚀 Quick Start

### Installation

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/kshk123/quick-reminder-capture.git
   cd quick-reminder-capture
   ```

2. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the extension folder
   - Pin the extension for quick access (optional)

3. **Start using basic features immediately!**
   - No configuration needed for local reminder management
   - Optional: Set up Google Calendar or Apple Reminders (see [SETUP.md](SETUP.md))

### Basic Usage (No Setup Required)

- **Capture from webpage**: Highlight text → right-click → "Add to Reminders"
- **Manual entry**: Click extension icon → type reminder → click "Save"
- **Set due dates**: Use the date/time picker for each reminder
- **Manage reminders**: View, edit, or delete from the popup

### Optional Integrations

#### Google Calendar
Requires one-time OAuth setup. See [Google Calendar Setup](SETUP.md#full-setup-with-google-calendar) for detailed instructions.

#### Apple Reminders (macOS only)
Simply run the included helper script:
```bash
./start-bridge.sh
```

See [Apple Reminders Setup](SETUP.md#apple-reminders-integration-macos-only) for details.

## 📋 Daily Usage

- **Capture from any page**: Highlight text → right-click → "Add to Reminders"
  - Automatically saves the text, page title, URL, and timestamp
- **Manage in popup**:
  - Set date/time for any reminder
  - Send to Google Calendar (creates a 1-hour event)
  - Send to Apple Reminders (via local bridge)
  - Delete individual reminders or clear all
- **Stay organized**: All reminders are stored locally and persist across browser sessions

## 📂 Project Structure

```
├── manifest.json            # Chrome extension manifest (MV3)
├── manifest.example.json    # Template with placeholder OAuth credentials
├── background.js            # Service worker: context menu, storage, API calls
├── popup.html              # Extension popup UI structure
├── popup.css               # Popup styling with toast notifications
├── popup.js                # Popup logic and event handlers
├── apple_reminders_bridge.py  # Python bridge for Apple Reminders (macOS)
├── start-bridge.sh         # Helper script to launch the bridge
├── SETUP.md                # Detailed setup and configuration guide
├── README.md               # This file
└── LICENSE                 # MIT License
```

## 🛠️ Tech Stack

- **Manifest V3** - Latest Chrome extension platform
- **Vanilla JavaScript** - No frameworks, pure JS
- **Chrome APIs** - Storage, Context Menus, Identity (OAuth)
- **Google Calendar API** - Calendar integration
- **AppleScript** - macOS Reminders integration (via Python bridge)
- **Python 3** - Local HTTP bridge for Apple Reminders

## ⚙️ Features Breakdown

### ✅ Works Without Setup
- Capture reminders from selected text on any webpage
- Add reminders manually with date/time
- View and manage all reminders in popup
- Local storage (private, browser-based)
- Toast notifications for better UX
- Bridge connectivity status indicator

### 🔑 Requires Google OAuth Setup
- Send reminders to Google Calendar (creates 1-hour events)

### 🍎 Requires Local Bridge (macOS only)
- Send reminders to Apple Reminders app
- Visual indicator shows bridge connection status

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


