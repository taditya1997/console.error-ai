// Runs in the PAGE context (not extension context)
// Captures console.error, uncaught exceptions, and unhandled promise rejections

(function () {
  const CHANNEL = "CONSOLE_ERROR_AI";

  function serialize(arg) {
    if (arg instanceof Error) {
      return { message: arg.message, stack: arg.stack };
    }
    if (typeof arg === "object" && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }

  function sendError(payload) {
    window.postMessage({ type: CHANNEL, payload }, "*");
  }

  // 1. Override console.error
  const originalError = console.error;
  console.error = function (...args) {
    try {
      const parts = args.map(serialize);
      const firstError = args.find((a) => a instanceof Error);
      sendError({
        source: "console.error",
        message: parts.map((p) => (typeof p === "object" ? p.message || JSON.stringify(p) : p)).join(" "),
        stack: firstError ? firstError.stack : null,
        url: window.location.href,
        timestamp: Date.now(),
        filename: null,
        lineno: null,
        colno: null,
      });
    } catch {
      // Never break the page
    }
    originalError.apply(console, args);
  };

  // 2. Uncaught exceptions
  window.addEventListener("error", function (event) {
    try {
      sendError({
        source: "uncaught_exception",
        message: event.message || String(event.error),
        stack: event.error ? event.error.stack : null,
        url: window.location.href,
        timestamp: Date.now(),
        filename: event.filename || null,
        lineno: event.lineno || null,
        colno: event.colno || null,
      });
    } catch {
      // Never break the page
    }
  });

  // 3. Unhandled promise rejections
  window.addEventListener("unhandledrejection", function (event) {
    try {
      const reason = event.reason;
      const isError = reason instanceof Error;
      sendError({
        source: "unhandled_rejection",
        message: isError ? reason.message : String(reason),
        stack: isError ? reason.stack : null,
        url: window.location.href,
        timestamp: Date.now(),
        filename: null,
        lineno: null,
        colno: null,
      });
    } catch {
      // Never break the page
    }
  });
})();
