const GOOGLE_SHEETS_ENDPOINT = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

const form = document.getElementById("contact-form");
const submitBtn = document.getElementById("submit-btn");
const successEl = document.getElementById("status-success");
const errorEl = document.getElementById("status-error");
const honeypot = document.getElementById("company");
const tsField = document.getElementById("ts");

const pageLoadTime = Date.now();
if (tsField) {
  tsField.value = new Date().toISOString();
}

const RATE_LIMIT_KEY = "ppd_contact_submissions";
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

function showStatus(el) {
  successEl.style.display = "none";
  errorEl.style.display = "none";
  if (el) {
    el.style.display = "block";
  }
}

function setButtonState(isSending) {
  submitBtn.disabled = isSending;
  submitBtn.textContent = isSending ? "Sending…" : "Send message";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function loadSubmissionLog() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function saveSubmissionLog(log) {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(log));
}

function passesRateLimit() {
  const now = Date.now();
  const log = loadSubmissionLog().filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (log.length >= RATE_LIMIT_MAX) {
    return false;
  }
  saveSubmissionLog(log);
  return true;
}

function recordSubmission() {
  const now = Date.now();
  const log = loadSubmissionLog().filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  log.push(now);
  saveSubmissionLog(log);
}

async function handleSubmit(event) {
  event.preventDefault();
  showStatus(null);

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!name || !email || !message) {
    showStatus(errorEl);
    return;
  }

  if (!isValidEmail(email)) {
    showStatus(errorEl);
    return;
  }

  if (message.length < 20 || message.length > 2000) {
    showStatus(errorEl);
    return;
  }

  if (honeypot && honeypot.value.trim() !== "") {
    return;
  }

  if (Date.now() - pageLoadTime < 2000) {
    showStatus(errorEl);
    return;
  }

  if (!passesRateLimit()) {
    showStatus(errorEl);
    return;
  }

  if (!GOOGLE_SHEETS_ENDPOINT || GOOGLE_SHEETS_ENDPOINT.includes("PASTE_YOUR")) {
    console.log("Missing Google Sheets endpoint.");
    showStatus(errorEl);
    return;
  }

  setButtonState(true);

  try {
    const payload = {
      name,
      email,
      message,
      user_agent: navigator.userAgent,
      referrer: document.referrer,
      ts: tsField ? tsField.value : new Date().toISOString(),
    };

    const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let result = null;
    try {
      result = await response.json();
    } catch (err) {
      result = null;
    }

    if (!response.ok || !result || result.ok !== true) {
      console.log("Submission failed:", response.status, result);
      showStatus(errorEl);
      return;
    }

    recordSubmission();
    form.reset();
    if (tsField) {
      tsField.value = new Date().toISOString();
    }
    showStatus(successEl);
  } catch (err) {
    console.log("Network error:", err);
    showStatus(errorEl);
  } finally {
    setButtonState(false);
  }
}

if (form) {
  form.addEventListener("submit", handleSubmit);
}
