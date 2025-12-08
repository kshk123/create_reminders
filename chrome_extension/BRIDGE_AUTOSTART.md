# Apple Reminders Bridge - Auto-Start Guide

This extension works best when the Apple Reminders bridge runs automatically in the background.

## Recommended Setup: LaunchAgent (Auto-start on Login)

The easiest way is to install the bridge as a **LaunchAgent**, which starts automatically when you log in to your Mac.

### Quick Setup

```bash
# Install the LaunchAgent
./install-launchagent.sh install
```

That's it! The bridge will now:
- ✅ Start automatically when you log in
- ✅ Run in the background
- ✅ Restart if it crashes
- ✅ Always be available to the extension

### Managing the Bridge

```bash
# Check if bridge is running
./install-launchagent.sh status

# Restart the bridge (generates new auth token)
./install-launchagent.sh restart

# Uninstall (stop auto-start)
./install-launchagent.sh uninstall
```

### View Logs

```bash
# Standard output
tail -f ~/Library/Logs/apple-reminders-bridge.log

# Errors
tail -f ~/Library/Logs/apple-reminders-bridge-error.log
```

## Alternative: Manual Start

If you prefer to start the bridge manually only when needed:

```bash
./start-bridge.sh
```

The extension will show a status indicator:
- 🟢 **Green**: Bridge is running and ready
- 🔴 **Red**: Bridge is not running (click "Send to Apple Reminders" will show an error)

## How It Works

1. **Extension checks bridge status** when popup opens
2. **Shows visual indicator** (green/red dot) in the popup
3. **Auto-reloads auth token** when bridge restarts
4. **No manual token copying needed** - everything is automatic!

## Why Not Extension-Controlled?

You might wonder why the extension doesn't start/stop the bridge automatically. Here's why:

- **Security**: Chrome extensions run in a sandbox and cannot execute system processes
- **Reliability**: A background service (LaunchAgent) is more reliable than having the extension manage it
- **Simplicity**: One-time setup vs. complex Native Messaging implementation
- **Performance**: Bridge stays ready instead of start/stop overhead

## Best Practice

**Install the LaunchAgent** and forget about it. The bridge will:
- Use minimal resources when idle
- Generate a new auth token on each restart for security
- Auto-sync the token to the extension
- Always be ready when you need it

---

**Need help?** See the main [SETUP.md](SETUP.md) for full documentation.
