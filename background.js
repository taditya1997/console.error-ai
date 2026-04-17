const MAX_ERRORS_DEFAULT = 100;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Set badge color on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#E53935" });
});

// Update badge count
async function updateBadge() {
  const { errors = [] } = await chrome.storage.local.get("errors");
  const count = errors.length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
}

// Store a new error
async function storeError(error) {
  const { errors = [] } = await chrome.storage.local.get("errors");
  const { maxErrors = MAX_ERRORS_DEFAULT } = await chrome.storage.sync.get("maxErrors");

  error.id = crypto.randomUUID();
  error.analysis = null;
  errors.push(error);

  // Cap at max errors (FIFO)
  while (errors.length > maxErrors) {
    errors.shift();
  }

  await chrome.storage.local.set({ errors });
  await updateBadge();
}

// Analyze an error with Gemini
async function analyzeError(errorId) {
  const { geminiApiKey } = await chrome.storage.sync.get("geminiApiKey");
  if (!geminiApiKey) {
    throw new Error("No API key configured. Go to Settings to add your Gemini API key.");
  }

  const { errors = [] } = await chrome.storage.local.get("errors");
  const error = errors.find((e) => e.id === errorId);
  if (!error) {
    throw new Error("Error not found.");
  }

  const prompt = `You are a senior web developer debugging assistant. Analyze this browser console error and provide:

1. **Explanation**: What this error means in plain, simple language
2. **Root Cause**: The most likely reason this error occurred
3. **Suggested Fix**: A concrete code fix with a code snippet

Error type: ${error.source}
Error message: ${error.message}
Stack trace: ${error.stack || "N/A"}
Page URL: ${error.url}
File: ${error.filename || "N/A"}
Line: ${error.lineno || "N/A"}, Column: ${error.colno || "N/A"}

Respond in markdown format with the three sections. Keep the explanation concise and actionable.`;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 401 || status === 403) throw new Error("Invalid API key. Check Settings.");
    if (status === 429) throw new Error("Rate limited. Try again in a moment.");
    throw new Error(`Gemini API error (${status}). Try again later.`);
  }

  const data = await res.json();
  const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!analysis) throw new Error("Empty response from Gemini.");

  // Save analysis back to storage
  error.analysis = analysis;
  await chrome.storage.local.set({ errors });

  return analysis;
}

// Clear all errors
async function clearErrors() {
  await chrome.storage.local.set({ errors: [] });
  await updateBadge();
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "NEW_ERROR") {
    storeError(message.error);
    return false;
  }

  if (message.action === "ANALYZE_ERROR") {
    analyzeError(message.id)
      .then((analysis) => sendResponse({ success: true, analysis }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }

  if (message.action === "CLEAR_ERRORS") {
    clearErrors().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.action === "GET_ERRORS") {
    chrome.storage.local.get("errors").then(({ errors = [] }) => {
      sendResponse({ errors });
    });
    return true;
  }
});
