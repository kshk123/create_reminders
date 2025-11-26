const MENU_ID = "add-reminder-from-selection";
const GOOGLE_CALENDAR_EVENT_DURATION_MS = 60 * 60 * 1000; // 1 hour
const APPLE_HELPER_PORT = 19092;
const MAX_REMINDERS = 1000; // Prevent excessive storage use
const MAX_REMINDER_TEXT_LENGTH = 1000; // Match bridge limit
const MAX_REMINDER_NOTES_LENGTH = 2000; // Match bridge limit

// Global variable to store the loaded auth token
let APPLE_AUTH_TOKEN = null;

// Load the auth token from the bridge config file
async function loadAuthToken() {
  try {
    const response = await fetch(chrome.runtime.getURL('bridge_config.json'));
    if (!response.ok) {
      console.warn('Bridge config file not found. Bridge may not be running.');
      return null;
    }
    const config = await response.json();
    return config.auth_token;
  } catch (error) {
    console.warn('Could not load auth token from bridge_config.json:', error);
    return null;
  }
}

// Initialize the auth token on startup
(async () => {
  APPLE_AUTH_TOKEN = await loadAuthToken();
  if (APPLE_AUTH_TOKEN && APPLE_AUTH_TOKEN !== 'REPLACE_ON_BRIDGE_STARTUP') {
    console.log('✓ Auth token loaded successfully from bridge_config.json');
  } else {
    console.warn('⚠ No valid auth token found. Start the Python bridge to generate one.');
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
  console.log("Context menu clicked!", info);
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;

  const trimmed = info.selectionText.trim();
  if (!trimmed) return;

  // Inject capture dialog into the page
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['capture-dialog.js']
    });

    // User cancelled or dialog failed
    if (!result || !result.result) {
      console.log("User cancelled reminder creation");
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
    
    // Enforce storage limit
    if (reminders.length >= MAX_REMINDERS) {
      console.warn(`Maximum ${MAX_REMINDERS} reminders reached. Oldest reminder not saved.`);
      return;
    }
    
    reminders.unshift(reminder);
    await chrome.storage.local.set({ reminders });
    console.log("Reminder saved:", reminder);
    
    // Show badge notification
    chrome.action.setBadgeText({ text: "✓" });
    chrome.action.setBadgeBackgroundColor({ color: "#10b981" }); // green
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" }); // Clear after 2 seconds
    }, 2000);
  } catch (err) {
    console.error("Could not show capture dialog:", err);
  }
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
      const { reminder, listName } = message;
      console.log("Received apple-reminders message with listName:", listName);
      if (!validateReminder(reminder)) {
        throw new Error("Invalid reminder object");
      }
      const result = await sendToAppleHelper(reminder, listName);
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

async function sendToAppleHelper(reminder, listName = "Create Reminders") {
  console.log("sendToAppleHelper called with listName:", listName);
  
  // Reload token if not available (e.g., bridge just started)
  if (!APPLE_AUTH_TOKEN || APPLE_AUTH_TOKEN === 'REPLACE_ON_BRIDGE_STARTUP') {
    console.log('Reloading auth token...');
    APPLE_AUTH_TOKEN = await loadAuthToken();
    if (!APPLE_AUTH_TOKEN || APPLE_AUTH_TOKEN === 'REPLACE_ON_BRIDGE_STARTUP') {
      throw new Error('Bridge not running. Start the Python bridge first: ./start-bridge.sh');
    }
  }
  
  // Validate input lengths before sending
  const combinedNotes = `${reminder.sourceTitle || ""} ${reminder.sourceUrl || ""}`.trim();
  if (combinedNotes.length > MAX_REMINDER_NOTES_LENGTH) {
    throw new Error("Source information too long");
  }
  
  const payload = {
    text: reminder.text,
    dueAt: reminder.dueAt || null,
    sourceUrl: reminder.sourceUrl || "",
    sourceTitle: reminder.sourceTitle || "",
    listName: listName || "Create Reminders"  // Use provided list name or default
  };
  
  console.log("Sending payload to bridge:", payload);

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
