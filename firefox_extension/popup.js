const listEl = document.getElementById("reminder-list");
const template = document.getElementById("reminder-template");
const countEl = document.getElementById("count");
const addBtn = document.getElementById("add-btn");
const clearBtn = document.getElementById("clear-btn");
const manualInput = document.getElementById("manual-text");
const manualDate = document.getElementById("manual-date");
const manualTime = document.getElementById("manual-time");
const bridgeStatus = document.getElementById("bridge-status");

// Storage limits
const MAX_REMINDERS = 1000; // Prevent excessive storage use
const MAX_REMINDER_TEXT_LENGTH = 1000; // Match bridge/backend limits
const DEFAULT_APPLE_LIST_NAME = "Create Reminders";

// Toast notification helper
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Check if Apple Reminders bridge is running
async function checkBridgeStatus() {
  try {
    await fetch("http://localhost:19092/reminder", {
      method: "OPTIONS"
    });
    updateBridgeStatus(true);
  } catch (err) {
    updateBridgeStatus(false);
  }
}

function updateBridgeStatus(isRunning) {
  if (!bridgeStatus) return;
  
  const statusText = bridgeStatus.querySelector(".status-text");
  const statusIndicator = bridgeStatus.querySelector(".status-indicator");
  
  if (isRunning) {
    bridgeStatus.className = "bridge-status online";
    statusIndicator.className = "status-indicator online";
    statusText.textContent = "Apple Reminders bridge: Connected";
  } else {
    bridgeStatus.className = "bridge-status offline";
    statusIndicator.className = "status-indicator offline";
    statusText.textContent = "Apple Reminders bridge: Not running";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderReminders();
  checkBridgeStatus();

  addBtn.addEventListener("click", handleManualAdd);
  manualInput.addEventListener("keyup", (evt) => {
    if (evt.key === "Enter") handleManualAdd();
  });
  clearBtn.addEventListener("click", clearAll);
  listEl.addEventListener("click", handleListClick);
});

async function getReminders() {
  const { reminders = [] } = await browser.storage.local.get(["reminders"]);
  return reminders;
}

async function saveReminders(reminders) {
  await browser.storage.local.set({ reminders });
}

async function handleManualAdd() {
  const text = manualInput.value.trim();
  if (!text) {
    showToast("Please enter reminder text", "error");
    return;
  }
  
  // Enforce length limit
  if (text.length > MAX_REMINDER_TEXT_LENGTH) {
    showToast(`Reminder text too long (max ${MAX_REMINDER_TEXT_LENGTH} characters)`, "error");
    return;
  }

  const dueAt = composeDueAt(manualDate.value, manualTime.value);
  
  // Validate date if provided
  if (manualDate.value && !dueAt) {
    showToast("Invalid date/time format", "error");
    return;
  }

  const reminder = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    text,
    sourceUrl: "",
    sourceTitle: "Added manually",
    createdAt: new Date().toISOString(),
    dueAt
  };

  const reminders = await getReminders();
  
  // Check storage limit
  if (reminders.length >= MAX_REMINDERS) {
    showToast(`Maximum ${MAX_REMINDERS} reminders reached. Please delete some first.`, "error");
    return;
  }
  
  reminders.unshift(reminder);
  await saveReminders(reminders);
  manualInput.value = "";
  manualDate.value = "";
  manualTime.value = "";
  await renderReminders();
  showToast("Reminder added successfully", "success");
}

async function clearAll() {
  if (!confirm("Are you sure you want to clear all reminders?")) {
    return;
  }
  await saveReminders([]);
  await renderReminders();
  showToast("All reminders cleared", "info");
}

async function handleListClick(event) {
  const target = event.target;

  const dueBtn = target.closest(".save-due-btn");
  if (dueBtn) {
    await saveDueAtFromRow(dueBtn.closest(".reminder"));
    return;
  }

  const gcalBtn = target.closest(".gcal-btn");
  if (gcalBtn) {
    await sendToGoogle(gcalBtn.closest(".reminder"));
    return;
  }

  const appleBtn = target.closest(".apple-btn");
  if (appleBtn) {
    await sendToApple(appleBtn.closest(".reminder"));
    return;
  }

  const deleteBtn = target.closest(".delete-btn");
  if (deleteBtn) {
    const item = deleteBtn.closest(".reminder");
    const id = item?.dataset.id;
    if (!id) return;

    const reminders = await getReminders();
    const next = reminders.filter((reminder) => reminder.id !== id);
    await saveReminders(next);
    await renderReminders();
  }
}

async function renderReminders() {
  const reminders = await getReminders();
  countEl.textContent =
    reminders.length === 1
      ? "1 saved item"
      : `${reminders.length} saved items`;

  listEl.innerHTML = "";

  if (!reminders.length) {
    const li = document.createElement("li");
    li.textContent = "No reminders yet.";
    li.style.color = "#64748b";
    li.style.fontSize = "12px";
    listEl.appendChild(li);
    return;
  }

  reminders.forEach((reminder) => {
    const clone = template.content.cloneNode(true);
    const li = clone.querySelector(".reminder");
    li.dataset.id = reminder.id;

    clone.querySelector(".text").textContent = reminder.text;

    const meta = [];
    if (reminder.sourceTitle) meta.push(reminder.sourceTitle);
    if (reminder.createdAt) {
      const date = new Date(reminder.createdAt);
      meta.push(date.toLocaleString());
    }
    if (reminder.dueAt) {
      const dueDate = new Date(reminder.dueAt);
      meta.push(`Due: ${dueDate.toLocaleString()}`);
    }
    clone.querySelector(".meta").textContent = meta.join(" • ");

    const dueInput = clone.querySelector(".due-input");
    dueInput.value = reminder.dueAt ? formatDateTimeLocal(reminder.dueAt) : "";

    const sourceLink = clone.querySelector(".source");
    if (reminder.sourceUrl) {
      sourceLink.href = reminder.sourceUrl;
      sourceLink.textContent = "Open source";
    } else {
      sourceLink.remove();
    }

    listEl.appendChild(clone);
  });
}

function formatDateTimeLocal(isoString) {
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function composeDueAt(dateStr, timeStr) {
  if (!dateStr) return "";
  const timePart = timeStr || "00:00";
  const iso = `${dateStr}T${timePart}`;
  const asDate = new Date(iso);
  if (Number.isNaN(asDate.getTime())) return "";
  return asDate.toISOString();
}

async function saveDueAtFromRow(rowEl) {
  const id = rowEl?.dataset.id;
  if (!id) return;

  const dueInput = rowEl.querySelector(".due-input");
  const value = dueInput?.value;
  let dueAt = "";
  if (value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      showToast("Invalid date/time", "error");
      return;
    }
    dueAt = date.toISOString();
  }

  const reminders = await getReminders();
  const next = reminders.map((reminder) =>
    reminder.id === id ? { ...reminder, dueAt } : reminder
  );
  await saveReminders(next);
  await renderReminders();
  showToast(dueAt ? "Date/time updated" : "Date/time cleared", "success");
}

async function sendToGoogle(rowEl) {
  const id = rowEl?.dataset.id;
  if (!id) return;
  const reminders = await getReminders();
  const reminder = reminders.find((r) => r.id === id);
  if (!reminder) return;

  const btn = rowEl.querySelector(".gcal-btn");
  if (!btn) return;

  // Show loading state
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const resp = await browser.runtime.sendMessage({
      type: "google-calendar",
      reminder
    });
    if (!resp?.ok) throw new Error(resp?.error || "Unknown error");
    showToast("Sent to Google Calendar successfully!", "success");
  } catch (err) {
    showToast(`Google Calendar: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function sendToApple(rowEl) {
  const id = rowEl?.dataset.id;
  if (!id) return;
  const reminders = await getReminders();
  const reminder = reminders.find((r) => r.id === id);
  if (!reminder) return;

  const btn = rowEl.querySelector(".apple-btn");
  if (!btn) return;

  // Get last used list name (or default)
  const { appleListName = DEFAULT_APPLE_LIST_NAME } = await browser.storage.local.get(["appleListName"]);
  
  // Ask user for list name with default value
  const listName = prompt("Enter Apple Reminders list name:", appleListName);
  
  // User cancelled
  if (listName === null) {
    return;
  }
  
  // Use provided name or fallback to default
  const finalListName = listName.trim() || DEFAULT_APPLE_LIST_NAME;
  
  // Save for next time
  await browser.storage.local.set({ appleListName: finalListName });

  // Show loading state
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const resp = await browser.runtime.sendMessage({
      type: "apple-reminders",
      reminder,
      listName: finalListName
    });
    if (!resp?.ok) throw new Error(resp?.error || "Unknown error");
    showToast(`✓ Sent to Apple Reminders (list: '${finalListName}')`, "success");
  } catch (err) {
    showToast(`Apple Reminders: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}
