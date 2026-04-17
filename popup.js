const errorListEl = document.getElementById("error-list");
const emptyStateEl = document.getElementById("empty-state");
const errorCountEl = document.getElementById("error-count");
const clearBtn = document.getElementById("clear-btn");
const settingsBtn = document.getElementById("settings-btn");

// --- Markdown renderer (lightweight, no deps) ---
function renderMarkdown(md) {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
      return `<pre><code>${escaped}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Paragraphs (blank line separated)
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br>");

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*?<\/li>\s*<br>?)+)/g, "<ul>$1</ul>");
  html = html.replace(/<br><\/ul>/g, "</ul>");
  html = html.replace(/<ul><br>/g, "<ul>");

  return `<p>${html}</p>`;
}

// --- Time formatting ---
function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --- Badge class helper ---
function getBadgeClass(source) {
  if (source === "console.error") return "badge-console-error";
  if (source === "uncaught_exception") return "badge-uncaught-exception";
  if (source === "unhandled_rejection") return "badge-unhandled-rejection";
  return "badge-console-error";
}

function getSourceLabel(source) {
  if (source === "console.error") return "Console Error";
  if (source === "uncaught_exception") return "Uncaught Exception";
  if (source === "unhandled_rejection") return "Unhandled Rejection";
  return source;
}

// --- Render error list ---
function renderErrors(errors) {
  if (errors.length === 0) {
    errorListEl.classList.add("hidden");
    emptyStateEl.classList.remove("hidden");
    errorCountEl.textContent = "0 errors";
    return;
  }

  errorListEl.classList.remove("hidden");
  emptyStateEl.classList.add("hidden");
  errorCountEl.textContent = `${errors.length} error${errors.length !== 1 ? "s" : ""}`;

  errorListEl.innerHTML = "";

  // Newest first
  const sorted = [...errors].reverse();

  for (const error of sorted) {
    const item = document.createElement("div");
    item.className = `error-item source-${error.source}`;
    item.dataset.id = error.id;

    const location =
      error.filename && error.lineno
        ? `<div class="error-location">${error.filename}:${error.lineno}${error.colno ? ":" + error.colno : ""}</div>`
        : "";

    const analysisHtml = error.analysis
      ? `<div class="analysis-result visible">${renderMarkdown(error.analysis)}</div>`
      : "";

    const btnText = error.analysis ? "Re-analyze" : "Analyze with AI";

    item.innerHTML = `
      <div class="error-header">
        <span class="source-badge ${getBadgeClass(error.source)}">${getSourceLabel(error.source)}</span>
        <span class="error-time">${timeAgo(error.timestamp)}</span>
      </div>
      <p class="error-message">${escapeHtml(error.message)}</p>
      <div class="error-url" title="${escapeHtml(error.url)}">${escapeHtml(error.url)}</div>
      ${location}
      <button class="analyze-btn" data-id="${error.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        ${btnText}
      </button>
      ${analysisHtml}
    `;

    // Analyze button handler
    const analyzeBtn = item.querySelector(".analyze-btn");
    analyzeBtn.addEventListener("click", () => handleAnalyze(analyzeBtn, error.id, item));

    errorListEl.appendChild(item);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// --- Analyze handler ---
async function handleAnalyze(btn, errorId, itemEl) {
  btn.disabled = true;
  btn.classList.add("loading");
  btn.innerHTML = '<span class="spinner"></span> Analyzing...';

  // Remove old analysis/error
  const oldAnalysis = itemEl.querySelector(".analysis-result");
  if (oldAnalysis) oldAnalysis.remove();
  const oldError = itemEl.querySelector(".analysis-error");
  if (oldError) oldError.remove();

  chrome.runtime.sendMessage({ action: "ANALYZE_ERROR", id: errorId }, (response) => {
    btn.disabled = false;
    btn.classList.remove("loading");

    if (response && response.success) {
      btn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        Re-analyze`;

      const analysisDiv = document.createElement("div");
      analysisDiv.className = "analysis-result visible";
      analysisDiv.innerHTML = renderMarkdown(response.analysis);
      itemEl.appendChild(analysisDiv);
    } else {
      btn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        Retry`;

      const errorDiv = document.createElement("div");
      errorDiv.className = "analysis-error";
      errorDiv.textContent = response ? response.error : "Failed to connect to background service.";
      itemEl.appendChild(errorDiv);
    }
  });
}

// --- Load errors ---
function loadErrors() {
  chrome.runtime.sendMessage({ action: "GET_ERRORS" }, (response) => {
    if (response && response.errors) {
      renderErrors(response.errors);
    }
  });
}

// --- Event listeners ---
clearBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "CLEAR_ERRORS" }, () => {
    loadErrors();
  });
});

settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Live update when new errors arrive
chrome.storage.onChanged.addListener((changes) => {
  if (changes.errors) {
    renderErrors(changes.errors.newValue || []);
  }
});

// Init
loadErrors();
