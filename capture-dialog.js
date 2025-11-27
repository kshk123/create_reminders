// This script is injected into web pages to show the capture dialog
(function() {
  const selectedText = document.getSelection().toString().trim();
  if (!selectedText) return null;

  // Function to extract and parse dates from text
  function extractDate(text) {
    const currentYear = new Date().getFullYear();
    
    // Try various date formats
    const patterns = [
      // Month Day with ordinal (December 18th, Dec 25th)
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
      // ISO format: 2025-12-25, 2025/12/25
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
      // US format: 12/25/2025, 12-25-2025
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
      // Natural language with year: December 25, 2025 or Dec 25 2025
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s+(\d{1,2}),?\s+(\d{4})/i,
      // Day Month Year: 25 December 2025
      /(\d{1,2})\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s+(\d{4})/i,
      // Relative dates: tomorrow, next week, next month
      /(tomorrow|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[0];
        
        // Handle relative dates
        if (/tomorrow/i.test(dateStr)) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
          return tomorrow;
        }
        
        if (/next\s+week/i.test(dateStr)) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          nextWeek.setHours(9, 0, 0, 0);
          return nextWeek;
        }
        
        if (/next\s+month/i.test(dateStr)) {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setHours(9, 0, 0, 0);
          return nextMonth;
        }
        
        // Handle day of week (next Monday, next Friday, etc.)
        const dayMatch = dateStr.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
        if (dayMatch) {
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDay = days.indexOf(dayMatch[1].toLowerCase());
          const today = new Date();
          const currentDay = today.getDay();
          const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7; // Next occurrence
          const nextDate = new Date();
          nextDate.setDate(today.getDate() + daysUntilTarget);
          nextDate.setHours(9, 0, 0, 0);
          return nextDate;
        }
        
        // Handle "Month Day" format (e.g., "December 18th", "Dec 25")
        const monthDayMatch = dateStr.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
        if (monthDayMatch) {
          const monthName = monthDayMatch[1];
          const day = parseInt(monthDayMatch[2]);
          
          // Try parsing with current year first
          let parsed = new Date(`${monthName} ${day}, ${currentYear}`);
          
          // If the date is in the past, try next year
          const now = new Date();
          if (parsed < now) {
            parsed = new Date(`${monthName} ${day}, ${currentYear + 1}`);
          }
          
          if (!isNaN(parsed.getTime())) {
            parsed.setHours(9, 0, 0, 0);
            return parsed;
          }
        }
        
        // Try parsing the date string
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          // Check if date is in the future
          const now = new Date();
          if (parsed > now) {
            // If no time specified, default to 9 AM
            if (parsed.getHours() === 0 && parsed.getMinutes() === 0) {
              parsed.setHours(9, 0, 0, 0);
            }
            return parsed;
          }
        }
      }
    }
    
    // Try to extract time if present (e.g., "3pm", "3:30 PM", "15:00")
    const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      const extractedDate = extractDate(text.replace(timeMatch[0], '').trim());
      if (extractedDate) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        
        if (meridiem === 'pm' && hours < 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;
        
        extractedDate.setHours(hours, minutes, 0, 0);
        return extractedDate;
      }
    }
    
    return null;
  }

  // Function to set reminder time before event
  function setReminderBeforeEvent(eventDate) {
    if (!eventDate) return null;
    
    const now = new Date();
    const eventTime = new Date(eventDate);
    const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);
    
    // If event is more than 24 hours away, remind 24 hours before
    if (hoursUntilEvent > 24) {
      const reminderDate = new Date(eventTime);
      reminderDate.setHours(reminderDate.getHours() - 24);
      return reminderDate;
    }
    
    // If event is more than 4 hours away, remind 4 hours before
    if (hoursUntilEvent > 4) {
      const reminderDate = new Date(eventTime);
      reminderDate.setHours(reminderDate.getHours() - 4);
      return reminderDate;
    }
    
    // If event is more than 2 hours away, remind 2 hours before
    if (hoursUntilEvent > 2) {
      const reminderDate = new Date(eventTime);
      reminderDate.setHours(reminderDate.getHours() - 2);
      return reminderDate;
    }
    
    // Otherwise, remind now (or 30 minutes before if possible)
    if (hoursUntilEvent > 0.5) {
      const reminderDate = new Date(eventTime);
      reminderDate.setMinutes(reminderDate.getMinutes() - 30);
      return reminderDate;
    }
    
    // Event is very soon or in the past, use current time
    return now;
  }

  const detectedDate = extractDate(selectedText);
  const reminderDate = detectedDate ? setReminderBeforeEvent(detectedDate) : null;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  `;

  const preview = selectedText.length > 150 ? selectedText.substring(0, 150) + '...' : selectedText;

  // Calculate time difference for display
  let reminderInfo = '';
  if (detectedDate && reminderDate) {
    const hoursDiff = Math.round((detectedDate - reminderDate) / (1000 * 60 * 60));
    const minutesDiff = Math.round((detectedDate - reminderDate) / (1000 * 60));
    
    let timeDiffText = '';
    if (hoursDiff >= 24) {
      timeDiffText = `${Math.floor(hoursDiff / 24)} day${hoursDiff >= 48 ? 's' : ''} before`;
    } else if (hoursDiff > 0) {
      timeDiffText = `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} before`;
    } else if (minutesDiff > 0) {
      timeDiffText = `${minutesDiff} minute${minutesDiff > 1 ? 's' : ''} before`;
    } else {
      timeDiffText = 'now';
    }
    
    reminderInfo = `
    <div style="background: #dbeafe; border-left: 3px solid #2563eb; padding: 10px 12px; margin-bottom: 12px; border-radius: 4px;">
      <div style="font-size: 12px; color: #1e40af; font-weight: 500; margin-bottom: 4px;">
        📅 Event detected: ${detectedDate.toLocaleString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })}
      </div>
      <div style="font-size: 12px; color: #1e40af;">
        ⏰ Reminder set: ${timeDiffText}
      </div>
    </div>
    `;
  }

  dialog.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
      📝 Add to Reminders
    </h3>
    <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin-bottom: 16px; color: #374151; font-size: 14px; line-height: 1.5; max-height: 100px; overflow-y: auto;">
      "${preview}"
    </div>
    ${reminderInfo}
    <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #374151;">
      Reminder Date & Time:
    </label>
    <input type="datetime-local" id="reminderDueDate" style="
      width: 100%;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 20px;
      box-sizing: border-box;
    ">
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancelBtn" style="
        padding: 10px 20px;
        border: 1px solid #d1d5db;
        background: #f3f4f6;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        color: #374151;
        display: flex;
        align-items: center;
        justify-content: center;
      ">Cancel</button>
      <button id="saveBtn" style="
        padding: 10px 20px;
        border: none;
        background: #2563eb;
        color: white;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      ">Save Reminder</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus the date input and set default value
  setTimeout(() => {
    const dateInput = document.getElementById('reminderDueDate');
    if (dateInput) {
      // Use reminder date (which is set before the event), or current time if no date detected
      const defaultDate = reminderDate || new Date();
      defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());
      dateInput.value = defaultDate.toISOString().slice(0, 16);
    }
  }, 100);

  // Return a promise that resolves with the user's choice
  return new Promise((resolve) => {
    document.getElementById('cancelBtn').onclick = () => {
      overlay.remove();
      resolve(null);
    };

    document.getElementById('saveBtn').onclick = () => {
      const dateInput = document.getElementById('reminderDueDate');
      const dueAt = dateInput && dateInput.value ? new Date(dateInput.value).toISOString() : null;
      overlay.remove();
      resolve({ text: selectedText, dueAt });
    };

    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(null);
      }
    };

    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
        resolve(null);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
})();
