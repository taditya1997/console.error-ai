// Bridge: Injects the page-context script and relays errors to the background service worker

// Inject inject.js into the page context
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for errors from the page context
window.addEventListener("message", function (event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== "CONSOLE_ERROR_AI") return;

  chrome.runtime.sendMessage({
    action: "NEW_ERROR",
    error: event.data.payload,
  });
});
