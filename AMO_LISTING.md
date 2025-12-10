# Firefox AMO Listing

## Name
Create Reminders

## Summary (max 250 characters)
Quickly save reminders from selected text with automatic date detection. Send to Google Calendar or Apple Reminders with one click.

## Description

### Save Reminders from Any Web Page

Select any text containing a date, right-click, and instantly create a reminder. The extension automatically detects dates and times in multiple formats.

### Features

✅ **Smart Date Detection**
- Recognizes dates like "December 25th", "25.12.2025", "next Tuesday", "tomorrow"
- Supports multiple formats: ISO, US, European (DD.MM.YYYY), and German
- Automatically extracts times ("3pm", "15:00", "14:30 Uhr")

✅ **Multiple Destinations**
- **Google Calendar**: Create calendar events with one click
- **Apple Reminders** (macOS): Send directly to Apple Reminders app

✅ **Context-Aware**
- Saves the source URL and page title with each reminder
- Easy access from the popup to jump back to the original page

✅ **Privacy-Focused**
- All data stored locally on your device
- No tracking, no analytics, no external servers
- Open source: review the code yourself

### How to Use

1. Select text containing a date on any web page
2. Right-click and choose "Add to Reminders"
3. Adjust the date/time if needed
4. Click "Save Reminder"
5. Optionally send to Google Calendar or Apple Reminders from the popup

### Apple Reminders Setup (macOS only)

Apple Reminders requires a separate local bridge. Download [`apple-reminders-bridge.zip`](https://github.com/kshk123/create_reminders/releases/latest/download/apple-reminders-bridge.zip) from GitHub Releases, extract, and run `./start-bridge.sh` (or install the launch agent for auto-start). The add-on connects to the running bridge on `http://localhost:19092`.

### Permissions Explained

- **storage**: Save reminders locally
- **contextMenus**: Add right-click menu option
- **activeTab**: Read your text selection
- **identity**: Google Calendar authentication
- **tabs**: Get page title and URL

### Open Source

This extension is free and open source:
https://github.com/kshk123/create_reminders

---

## Categories
- Productivity
- Bookmarking

## Tags
reminders, calendar, productivity, google calendar, apple reminders, date picker, bookmarks, save for later

## Support URL
https://github.com/kshk123/create_reminders/issues

## Homepage URL
https://github.com/kshk123/create_reminders
