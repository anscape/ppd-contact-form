const GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbwHk6tLwb3bC_5SC6iGstptG33n2zf_Plgl-n2PdHtbOFaqER0secuFP48R3Kf7t2oNAQ/exec";

const form = document.getElementById("contact-form");
const submitBtn = document.getElementById("submit-btn");
const successEl = document.getElementById("status-success");
const errorEl = document.getElementById("status-error");
const honeypot = document.getElementById("company");
const tsField = document.getElementById("ts");
const errorDefault = errorEl ? errorEl.textContent : "Something went wrong.";

const pageLoadTime = Date.now();
if (tsField) {
  tsField.value = new Date().toISOString();
}

if (submitBtn) {
  submitBtn.disabled = true;
  submitBtn.textContent = "Please wait…";
  window.setTimeout(() => {
    if (!submitBtn.disabled) return;
    submitBtn.disabled = false;
    submitBtn.textContent = "Send message";
  }, 2000);
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

function showError(message) {
  if (errorEl) {
    errorEl.textContent = message || errorDefault;
  }
  showStatus(errorEl);
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
    showError("Please fill in all fields.");
    return;
  }

  if (!isValidEmail(email)) {
    showError("Please enter a valid email address.");
    return;
  }

  if (message.length < 20 || message.length > 2000) {
    showError("Message must be 20–2000 characters.");
    return;
  }

  if (honeypot && honeypot.value.trim() !== "") {
    return;
  }

  if (Date.now() - pageLoadTime < 2000) {
    showError("Please wait a moment and try again.");
    return;
  }

  if (!passesRateLimit()) {
    showError("Too many submissions. Try again in 10 minutes.");
    return;
  }

  if (!GOOGLE_SHEETS_ENDPOINT || GOOGLE_SHEETS_ENDPOINT.includes("PASTE_YOUR")) {
    console.log("Missing Google Sheets endpoint.");
    showError("Endpoint is not configured.");
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
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (response.type === "opaque") {
      recordSubmission();
      form.reset();
      if (tsField) {
        tsField.value = new Date().toISOString();
      }
      showStatus(successEl);
      return;
    }

    let result = null;
    try {
      result = await response.json();
    } catch (err) {
      result = null;
    }

    if (!response.ok || !result || result.ok !== true) {
      console.log("Submission failed:", response.status, result);
      showError();
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
    showError();
  } finally {
    setButtonState(false);
  }
}

if (form) {
  form.addEventListener("submit", handleSubmit);
}
