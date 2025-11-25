const MENU_ID = "add-reminder-from-selection";
const GOOGLE_CALENDAR_EVENT_DURATION_MS = 60 * 60 * 1000; // 1 hour
const APPLE_HELPER_PORT = 19092;
// IMPORTANT: Replace this with the token shown when you start the Python bridge
// This prevents unauthorized access to the local bridge
const APPLE_AUTH_TOKEN = "REPLACE_WITH_TOKEN_FROM_BRIDGE_STARTUP";
const MAX_REMINDERS = 1000; // Prevent excessive storage use
const MAX_REMINDER_TEXT_LENGTH = 1000; // Match bridge limit
const MAX_REMINDER_NOTES_LENGTH = 2000; // Match bridge limit

function ensureMenu() {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Add to Reminders",
    contexts: ["selection"]
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    ensureMenu();
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;

  const trimmed = info.selectionText.trim();
  if (!trimmed) return;

  const reminder = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    text: trimmed,
    sourceUrl: info.pageUrl || tab?.url || "",
    sourceTitle: tab?.title || "",
    createdAt: new Date().toISOString()
  };

  const { reminders = [] } = await chrome.storage.local.get(["reminders"]);
  
  // Enforce storage limit
  if (reminders.length >= MAX_REMINDERS) {
    console.warn(`Maximum ${MAX_REMINDERS} reminders reached. Oldest reminder not saved.`);
    return;
  }
  
  reminders.unshift(reminder);
  await chrome.storage.local.set({ reminders });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = async () => {
    // Validate message structure
    if (!message || !message.type) {
      throw new Error("Invalid message format");
    }

    if (message.type === "google-calendar") {
      const { reminder } = message;
      if (!validateReminder(reminder)) {
        throw new Error("Invalid reminder object");
      }
      const result = await createGoogleEvent(reminder);
      return result;
    }

    if (message.type === "apple-reminders") {
      const { reminder } = message;
      if (!validateReminder(reminder)) {
        throw new Error("Invalid reminder object");
      }
      const result = await sendToAppleHelper(reminder);
      return result;
    }
    
    throw new Error("Unknown message type");
  };

  handler()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));

  return true; // keep message channel open for async work
});

function validateReminder(reminder) {
  if (!reminder || typeof reminder !== "object") {
    return false;
  }
  if (typeof reminder.text !== "string" || !reminder.text.trim()) {
    return false;
  }
  // Enforce length limits
  if (reminder.text.length > MAX_REMINDER_TEXT_LENGTH) {
    return false;
  }
  return true;
}

async function createGoogleEvent(reminder) {
  if (!reminder?.dueAt) {
    throw new Error("Set a date/time before sending to Google Calendar.");
  }

  const token = await getGoogleToken();
  const start = new Date(reminder.dueAt);
  const end = new Date(start.getTime() + GOOGLE_CALENDAR_EVENT_DURATION_MS);

  const event = {
    summary: reminder.text || "Reminder",
    description: reminder.sourceUrl
      ? `${reminder.sourceTitle || "Source"}: ${reminder.sourceUrl}`
      : "Saved from Reminder Capture extension",
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() }
  };

  try {
    const resp = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    if (!resp.ok) {
      const detail = await resp.text();
      throw new Error(`Google Calendar error (${resp.status}): ${detail}`);
    }

    return await resp.json();
  } catch (err) {
    if (err.message.includes("Failed to fetch")) {
      throw new Error("Network error: Check your internet connection");
    }
    throw err;
  }
}

function getGoogleToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || "No token"));
      } else {
        resolve(token);
      }
    });
  });
}

async function sendToAppleHelper(reminder) {
  // Validate input lengths before sending
  const combinedNotes = `${reminder.sourceTitle || ""} ${reminder.sourceUrl || ""}`.trim();
  if (combinedNotes.length > MAX_REMINDER_NOTES_LENGTH) {
    throw new Error("Source information too long");
  }
  
  const payload = {
    text: reminder.text,
    dueAt: reminder.dueAt || null,
    sourceUrl: reminder.sourceUrl || "",
    sourceTitle: reminder.sourceTitle || ""
  };

  try {
    const resp = await fetch(`http://localhost:${APPLE_HELPER_PORT}/reminder`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Auth-Token": APPLE_AUTH_TOKEN
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const detail = await resp.text();
      throw new Error(`Apple helper error (${resp.status}): ${detail}`);
    }
    return await resp.json();
  } catch (err) {
    if (err.message.includes("Failed to fetch")) {
      throw new Error("Cannot connect to Apple Reminders helper. Make sure the bridge is running.");
    }
    throw err;
  }
}
