// Chrome-specific background (MV3)
const MENU_ID = "add-reminder-from-selection";
const GOOGLE_CALENDAR_EVENT_DURATION_MS = 60 * 60 * 1000; // 1 hour
const APPLE_HELPER_PORT = 19092;
const MAX_REMINDERS = 1000; // Prevent excessive storage use
const MAX_REMINDER_TEXT_LENGTH = 1000; // Match bridge limit
const MAX_REMINDER_NOTES_LENGTH = 2000; // Match bridge limit

// Global variable to store the loaded auth token
let APPLE_AUTH_TOKEN = null;

// Load the auth token directly from the running bridge (preferred)
async function loadAuthToken() {
  // Try fetching from the bridge directly (always has the current token)
  try {
    const response = await fetch(`http://localhost:${APPLE_HELPER_PORT}/token`);
    if (response.ok) {
      const config = await response.json();
      console.log('✓ Auth token fetched from bridge');
      return config.auth_token;
    }
  } catch (error) {
    // Bridge not running
  }
  
  return null;
}

// Initialize the auth token on startup
(async () => {
  APPLE_AUTH_TOKEN = await loadAuthToken();
  if (APPLE_AUTH_TOKEN && APPLE_AUTH_TOKEN !== 'REPLACE_ON_BRIDGE_STARTUP') {
    console.log('✓ Auth token loaded successfully from running bridge');
  } else {
    console.warn('⚠ No valid auth token found. Start the Apple bridge (download from GitHub releases) to generate one.');
  }
})();

function ensureMenu() {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Add to Reminders",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error creating context menu:", chrome.runtime.lastError);
    } else {
      console.log("Context menu created successfully");
    }
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

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['capture-dialog.js']
    });

    if (!result || !result.result) {
      return;
    }

    const { text, dueAt } = result.result;

    const reminder = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      text: text,
      dueAt: dueAt || null,
      sourceUrl: info.pageUrl || tab?.url || "",
      sourceTitle: tab?.title || "",
      createdAt: new Date().toISOString()
    };

    const { reminders = [] } = await chrome.storage.local.get(["reminders"]);

    if (reminders.length >= MAX_REMINDERS) {
      return;
    }

    reminders.unshift(reminder);
    await chrome.storage.local.set({ reminders });

    chrome.action.setBadgeText({ text: "✓" });
    chrome.action.setBadgeBackgroundColor({ color: "#10b981" }); // green
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 2000);
  } catch (err) {
    console.error("Could not show capture dialog:", err);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = async () => {
    if (!message || !message.type) throw new Error("Invalid message format");

    if (message.type === "google-calendar") {
      const { reminder } = message;
      if (!validateReminder(reminder)) throw new Error("Invalid reminder object");
      return await createGoogleEvent(reminder);
    }

    if (message.type === "apple-reminders") {
      const { reminder, listName } = message;
      if (!validateReminder(reminder)) throw new Error("Invalid reminder object");
      return await sendToAppleHelper(reminder, listName);
    }

    throw new Error("Unknown message type");
  };

  handler()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));

  return true;
});

function validateReminder(reminder) {
  if (!reminder || typeof reminder !== "object") return false;
  if (typeof reminder.text !== "string" || !reminder.text.trim()) return false;
  if (reminder.text.length > MAX_REMINDER_TEXT_LENGTH) return false;
  return true;
}

async function createGoogleEvent(reminder) {
  if (!reminder?.dueAt) throw new Error("Set a date/time before sending to Google Calendar.");

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

async function sendToAppleHelper(reminder, listName = "Create Reminders") {
  if (!APPLE_AUTH_TOKEN || APPLE_AUTH_TOKEN === 'REPLACE_ON_BRIDGE_STARTUP') {
    APPLE_AUTH_TOKEN = await loadAuthToken();
    if (!APPLE_AUTH_TOKEN || APPLE_AUTH_TOKEN === 'REPLACE_ON_BRIDGE_STARTUP') {
      throw new Error('Bridge not running. Start the Python bridge first: ./start-bridge.sh');
    }
  }

  const combinedNotes = `${reminder.sourceTitle || ""} ${reminder.sourceUrl || ""}`.trim();
  if (combinedNotes.length > MAX_REMINDER_NOTES_LENGTH) {
    throw new Error("Source information too long");
  }

  const payload = {
    text: reminder.text,
    dueAt: reminder.dueAt || null,
    sourceUrl: reminder.sourceUrl || "",
    sourceTitle: reminder.sourceTitle || "",
    listName: listName || "Create Reminders"
  };

  let resp = await fetch(`http://localhost:${APPLE_HELPER_PORT}/reminder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": APPLE_AUTH_TOKEN
    },
    body: JSON.stringify(payload)
  });

  // If unauthorized, refresh token and retry once
  if (resp.status === 403) {
    console.log('Auth failed, refreshing token...');
    APPLE_AUTH_TOKEN = await loadAuthToken();
    if (!APPLE_AUTH_TOKEN) {
      throw new Error('Bridge not running. Install and start the Apple bridge from the GitHub release.');
    }
    resp = await fetch(`http://localhost:${APPLE_HELPER_PORT}/reminder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": APPLE_AUTH_TOKEN
      },
      body: JSON.stringify(payload)
    });
  }

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Apple helper error (${resp.status}): ${detail}`);
  }
  return await resp.json();
}
