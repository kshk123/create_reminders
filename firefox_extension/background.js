// Firefox-specific background (MV3-ish, promise-based APIs)
const MENU_ID = "add-reminder-from-selection";
const GOOGLE_CALENDAR_EVENT_DURATION_MS = 60 * 60 * 1000; // 1 hour
const APPLE_HELPER_PORT = 19092;
const MAX_REMINDERS = 1000; // Prevent excessive storage use
const MAX_REMINDER_TEXT_LENGTH = 1000; // Match bridge limit
const MAX_REMINDER_NOTES_LENGTH = 2000; // Match bridge limit

// Google OAuth configuration (Firefox MV2 doesn't support manifest oauth2 block)
const GOOGLE_CLIENT_ID = "1096127465770-99om5eupqi2dou7hpp4e3f8jbv9cu466.apps.googleusercontent.com";
const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

let APPLE_AUTH_TOKEN = null;

// Load the auth token from the running bridge's /token endpoint
// The bridge must be running for Apple Reminders integration to work
async function loadAuthToken() {
  try {
    const response = await fetch(`http://localhost:${APPLE_HELPER_PORT}/token`);
    if (response.ok) {
      const config = await response.json();
      return config.auth_token;
    }
  } catch (error) {
    // Bridge not running
  }
  return null;
}

(async () => {
  APPLE_AUTH_TOKEN = await loadAuthToken();
})();

async function ensureMenu() {
  try {
    const menusApi = browser.contextMenus || browser.menus;
    if (!menusApi?.create) {
      console.error("No menus API available");
      return;
    }
    await menusApi.removeAll();
    await menusApi.create({
      id: MENU_ID,
      title: "Add to Reminders",
      contexts: ["selection"]
    });
  } catch (err) {
    console.error("contextMenus error:", err);
  }
}

browser.runtime.onInstalled.addListener(() => {
  ensureMenu();
});

// Also ensure the menu exists when the background script first runs (e.g., temporary install)
ensureMenu().catch((err) => console.error("Failed to ensure context menu on startup:", err));

// Ensure on startup events too (some Firefox versions)
if (browser.runtime.onStartup) {
  browser.runtime.onStartup.addListener(() => {
    ensureMenu().catch((err) => console.error("Failed to ensure context menu on startup event:", err));
  });
}

async function executeScriptCompat(tabId, files) {
  if (browser.scripting?.executeScript) {
    return browser.scripting.executeScript({ target: { tabId }, files });
  }
  // Fallback for older Firefox builds
  const results = await browser.tabs.executeScript(tabId, { file: files[0] });
  return results.map((r) => ({ result: r }));
}

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;
  const trimmed = info.selectionText.trim();
  if (!trimmed) return;

  try {
    const [result] = await executeScriptCompat(tab.id, ['capture-dialog.js']);
    if (!result || !result.result) return;
    const { text, dueAt } = result.result;

    const reminder = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      text,
      dueAt: dueAt || null,
      sourceUrl: info.pageUrl || tab?.url || "",
      sourceTitle: tab?.title || "",
      createdAt: new Date().toISOString()
    };

    const { reminders = [] } = await browser.storage.local.get(["reminders"]);
    if (reminders.length >= MAX_REMINDERS) return;

    reminders.unshift(reminder);
    await browser.storage.local.set({ reminders });

    // Show badge notification (MV2 uses browserAction, MV3 uses action)
    const badgeApi = browser.action || browser.browserAction;
    if (badgeApi?.setBadgeText) {
      await badgeApi.setBadgeText({ text: "✓" });
      await badgeApi.setBadgeBackgroundColor({ color: "#10b981" });
      setTimeout(() => badgeApi.setBadgeText({ text: "" }), 2000);
    }
  } catch (err) {
    console.error("Could not show capture dialog:", err);
  }
});

browser.runtime.onMessage.addListener((message) => {
  return (async () => {
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
  })();
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

async function getGoogleToken() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_SCOPES.length) {
    throw new Error("Google OAuth not configured");
  }

  const redirectUri = browser.identity.getRedirectURL();
  const scopeParam = encodeURIComponent(GOOGLE_SCOPES.join(" "));
  const authUrl = [
    "https://accounts.google.com/o/oauth2/v2/auth",
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}`,
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    "response_type=token",
    `scope=${scopeParam}`,
    "prompt=consent",
    "include_granted_scopes=true"
  ].join("&").replace("auth&", "auth?");

  const redirectedTo = await browser.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true
  });

  const token = parseTokenFromRedirect(redirectedTo);
  if (!token) throw new Error("No access token returned");
  return token;
}

function parseTokenFromRedirect(url) {
  try {
    const parsed = new URL(url);
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    return hash.get("access_token");
  } catch (_e) {
    return null;
  }
}

async function sendToAppleHelper(reminder, listName = "Create Reminders") {
  if (!APPLE_AUTH_TOKEN || APPLE_AUTH_TOKEN === 'REPLACE_ON_BRIDGE_STARTUP') {
    APPLE_AUTH_TOKEN = await loadAuthToken();
    if (!APPLE_AUTH_TOKEN || APPLE_AUTH_TOKEN === 'REPLACE_ON_BRIDGE_STARTUP') {
      throw new Error('Bridge not running. Install and start the Apple bridge from the GitHub release.');
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
