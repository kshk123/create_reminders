# 📝 Create Reminders

> A Chrome/Firefox extension to capture reminders from any webpage and sync them to Google Calendar or Apple Reminders.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-1a73e8?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/create-reminders/ecifdofkbodefbieanakcmhnncjhflkh)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox%20Add--ons-Install-ff7139?logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/create-reminders/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-Apple%20Reminders-black?logo=apple)](https://www.apple.com/reminders/)
[![Google Calendar](https://img.shields.io/badge/Google-Calendar-green?logo=google-calendar)](https://calendar.google.com/)

<details>
  <summary>🎥 Quick demo (right-click capture → reminder)</summary>
  <video src="CreateReminderDemo.mp4" width="640" controls muted playsinline loop>
    <a href="CreateReminderDemo.mp4">Watch the demo video</a>
  </video>
</details>


## ✨ Features

- 🔍 **Capture from any webpage** - Right-click selected text to save as a reminder
- 📅 **Set due dates/times** - Add datetime to any reminder with built-in picker
- 📆 **Google Calendar sync** - Send reminders directly to your Google Calendar
- 🍎 **Apple Reminders integration** - macOS users can sync to native Reminders app
- 💾 **Local storage** - All data stays private in your browser

## 📖 Documentation

**For detailed setup instructions, see [SETUP.md](SETUP.md)**

The setup guide includes:
- Step-by-step Google OAuth configuration
- Apple Reminders bridge setup for macOS
- Troubleshooting common issues
- Feature overview and usage tips

## 🚀 Quick Start

### Browser targets
- **Chrome**: use `manifest.chrome.json` + `background.chrome.js` (default files are equivalent).
- **Firefox**: use `manifest.firefox.json` + `background.firefox.js` (promise-based APIs and `launchWebAuthFlow`).
  - Copy/rename the appropriate manifest/background before loading the extension, or create a packed zip with those files renamed to `manifest.json` and `background.js`.

### Installation

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/kshk123/create_reminders.git
   cd create_reminders
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

Download [`apple-reminders-bridge.zip`](https://github.com/kshk123/create_reminders/releases/latest/download/apple-reminders-bridge.zip) from GitHub Releases, extract, and:
- **Auto-start (Recommended):** `./install-launchagent.sh install`
- **Manual start:** `./start-bridge.sh`

The bridge runs on `http://localhost:19092`. The extension fetches the auth token from the running bridge (no token file ships with the extension). See [Apple Reminders Setup](SETUP.md#apple-reminders-integration-macos-only) and [Auto-Start Guide](BRIDGE_AUTOSTART.md) for details.

## 📋 Usage

- **Capture from any page**: Highlight text → right-click → "Add to Reminders"
  - Automatically saves the text, page title, URL, and timestamp
- **Manage in popup**:
  - Set date/time for any reminder
  - Send to Google Calendar (creates a 1-hour event)
  - Send to Apple Reminders (via local bridge)
  - Delete individual reminders or clear all


## 🧪 Testing

Run the test suite to validate date parsing and reminder timing:

```bash
# Open test runner in browser
open tests/test-runner.html
```

Click "Run All Tests" to execute the test suite. All tests should pass.

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
