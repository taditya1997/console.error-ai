const apiKeyInput = document.getElementById("api-key");
const maxErrorsSelect = document.getElementById("max-errors");
const saveBtn = document.getElementById("save-btn");
const testBtn = document.getElementById("test-btn");
const toggleBtn = document.getElementById("toggle-visibility");
const statusEl = document.getElementById("status");

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Load saved settings
chrome.storage.sync.get(["geminiApiKey", "maxErrors"], (data) => {
  if (data.geminiApiKey) apiKeyInput.value = data.geminiApiKey;
  if (data.maxErrors) maxErrorsSelect.value = String(data.maxErrors);
});

// Toggle key visibility
toggleBtn.addEventListener("click", () => {
  apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
});

// Show status
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove("hidden");
  setTimeout(() => statusEl.classList.add("hidden"), 4000);
}

// Save
saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  const maxErrors = parseInt(maxErrorsSelect.value, 10);

  if (!key) {
    showStatus("Please enter an API key.", "error");
    return;
  }

  chrome.storage.sync.set({ geminiApiKey: key, maxErrors }, () => {
    showStatus("Settings saved successfully!", "success");
  });
});

// Test API key
testBtn.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showStatus("Enter an API key first.", "error");
    return;
  }

  testBtn.textContent = "Testing...";
  testBtn.disabled = true;

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say hello in one word." }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });

    if (res.ok) {
      showStatus("API key is valid! Connection successful.", "success");
    } else if (res.status === 401 || res.status === 403) {
      showStatus("Invalid API key. Please check and try again.", "error");
    } else if (res.status === 429) {
      showStatus("Rate limited. Key is valid but try again later.", "success");
    } else {
      showStatus(`API returned status ${res.status}. Check your key.`, "error");
    }
  } catch {
    showStatus("Network error. Check your internet connection.", "error");
  }

  testBtn.textContent = "Test API Key";
  testBtn.disabled = false;
});
