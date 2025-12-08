# Privacy Policy for Create Reminders Extension

**Last updated:** December 8, 2025

## Overview

Create Reminders is a browser extension that helps you save reminders from selected text on web pages. This privacy policy explains what data the extension collects, how it's used, and your rights.

## Data Collection

### Data Stored Locally

The extension stores the following data **locally on your device** using the browser's built-in storage:

- **Reminder text**: The text you select to create reminders
- **Due dates/times**: Dates and times you set for reminders
- **Source URLs**: The web page URL where you created the reminder
- **Source titles**: The title of the web page where you created the reminder

This data **never leaves your device** unless you explicitly choose to send it to Google Calendar or Apple Reminders.

### Data Shared with Third Parties

#### Google Calendar (Optional)
If you choose to send a reminder to Google Calendar:
- The reminder text, date/time, and source information are sent to Google's servers
- This requires you to authenticate with your Google account
- Google's privacy policy applies: https://policies.google.com/privacy

#### Apple Reminders (Optional, macOS only)
If you choose to send a reminder to Apple Reminders:
- The reminder text, date/time, and source information are sent to the local Apple Reminders bridge (running on localhost)
- The bridge communicates with Apple Reminders on your Mac via AppleScript
- No data is sent to external servers

### Data NOT Collected

This extension does **NOT**:
- Track your browsing history
- Collect analytics or usage data
- Send data to any servers owned by the extension developer
- Access any data beyond what you explicitly select
- Use cookies or tracking technologies

## Data Storage and Security

- All reminder data is stored locally using the browser's secure storage API
- Data is only accessible to this extension
- No encryption is applied beyond the browser's built-in protections
- You can delete all stored data at any time through the extension popup

## Your Rights

You can:
- **View** all stored reminders in the extension popup
- **Delete** individual reminders or all reminders at any time
- **Revoke** Google Calendar access through your Google account settings
- **Uninstall** the extension to remove all locally stored data

## Permissions Explained

| Permission | Why It's Needed |
|------------|-----------------|
| `storage` | Store your reminders locally |
| `contextMenus` | Add "Add to Reminders" to right-click menu |
| `activeTab` | Read selected text on the current page |
| `identity` | Authenticate with Google Calendar (optional) |
| `tabs` | Get page title and URL for reminder context |

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last updated" date above.

## Contact

For questions about this privacy policy or the extension, please open an issue on GitHub:
https://github.com/kshk123/create_reminders

## Open Source

This extension is open source. You can review the code at:
https://github.com/kshk123/create_reminders
