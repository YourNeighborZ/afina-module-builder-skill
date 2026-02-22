# Afina Module File Templates

## `settings.json` Template

```json
{
  "type": "Text Transform",
  "fields": [
    {
      "name": "inputText",
      "label": "Specify input value",
      "type": "text",
      "default": "",
      "loadTo": true
    },
    {
      "name": "saveTo",
      "label": "Save result to variable",
      "type": "text",
      "default": ""
    }
  ]
}
```

## `index.js` Template (IPC-safe with global handlers)

```javascript
const replacePlaceholders = (value, savedObjects) => {
  if (typeof value !== "string") return value;
  return value.replace(/\$\{([^}]+)\}/g, (_, variable) => {
    const key = String(variable || "").trim();
    const replacement =
      savedObjects && key in savedObjects ? savedObjects[key] : "";
    return replacement === undefined || replacement === null
      ? ""
      : String(replacement);
  });
};

const moduleFunction = async (
  element,
  savedObjects,
  connections,
  elementMap,
  currentElementId,
  uuid,
  port,
  wsEndpoint,
) => {
  const logger = {
    info: (message) => process.send?.({ type: "log", level: "info", message }),
    warn: (message) => process.send?.({ type: "log", level: "warn", message }),
    error: (message) =>
      process.send?.({ type: "log", level: "error", message }),
  };

  try {
    const settings = element?.settings || {};
    const inputText = replacePlaceholders(
      settings.inputText ?? "",
      savedObjects,
    );
    const saveTo = replacePlaceholders(settings.saveTo ?? "", savedObjects);

    const result = String(inputText).trim();

    if (saveTo && savedObjects && typeof savedObjects === "object") {
      savedObjects[saveTo] = result;
    }

    return result;
  } catch (error) {
    logger.error(`Module error: ${error.message}`);
    throw error;
  }
};

process.on("message", async (msg) => {
  try {
    const result = await moduleFunction(
      msg.payload.element,
      msg.payload.savedObjects,
      msg.payload.connections,
      msg.payload.elementMap,
      msg.payload.currentElementId,
      msg.payload.uuid,
      msg.payload.port,
      msg.payload.wsEndpoint,
    );
    process.send?.({ status: "success", result });
  } catch (err) {
    process.send?.({ status: "error", message: err.message, stack: err.stack });
  }
});

// Global handlers for Node.js child process protection
process.on("uncaughtException", (err) => {
  try {
    process.send?.({
      status: "error",
      message: `Uncaught Exception: ${err.message}`,
    });
  } catch (_) {}
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  try {
    process.send?.({
      status: "error",
      message: `Unhandled Rejection: ${reason}`,
    });
  } catch (_) {}
  process.exit(1);
});

process.on("disconnect", () => {
  process.exit(0);
});

if (typeof process.send === "function") {
  process.send({ status: "ready" });
}
```

---

## Puppeteer Module Templates

Use these when the task requires real DOM access (clicks, reading page content, iframes).

### `utils.js` — canonical helper file (mandatory for browser modules)

**Do not write this file manually.** Copy it verbatim from `references/canonical/utils.js`.

It exports: `replacePlaceholders`, `delay`, `connectToBrowser`, `getCurrentPage`.

In `index.js`, require it as:

```javascript
const { replacePlaceholders, getCurrentPage, connectToBrowser } = require('./utils');
```

### `index.js` Skeleton — Puppeteer module (IPC-safe)

```javascript
const { replacePlaceholders, getCurrentPage, connectToBrowser } = require('./utils');

const moduleFunction = async (
  element,
  savedObjects,
  _connections,
  _elementMap,
  _currentElementId,
  _uuid,
  _port,
  wsEndpoint,
) => {
  const logger = {
    info: (message) => process.send?.({ type: "log", level: "info", message }),
    warn: (message) => process.send?.({ type: "log", level: "warn", message }),
    error: (message) => process.send?.({ type: "log", level: "error", message }),
  };

  if (!wsEndpoint) throw new Error("wsEndpoint not provided. Start browser before using this module.");

  const settings = element?.settings || {};
  const saveTo = replacePlaceholders(settings.saveTo ?? "", savedObjects);

  const browser = await connectToBrowser(wsEndpoint);

  try {
    const page = await getCurrentPage(browser);

    // --- put business logic here ---
    const result = ""; // final business value

    if (saveTo && savedObjects && typeof savedObjects === "object") {
      savedObjects[saveTo] = result;
    }

    return result;
  } catch (error) {
    logger.error(`Module error: ${error.message}`);
    throw error;
  } finally {
    try { browser.disconnect(); } catch (_) {}
  }
};

process.on("message", async (msg) => {
  try {
    const result = await moduleFunction(
      msg.payload.element,
      msg.payload.savedObjects,
      msg.payload.connections,
      msg.payload.elementMap,
      msg.payload.currentElementId,
      msg.payload.uuid,
      msg.payload.port,
      msg.payload.wsEndpoint,
    );
    process.send?.({ status: "success", result });
  } catch (err) {
    process.send?.({ status: "error", message: err.message, stack: err.stack });
  }
});

process.on("uncaughtException", (err) => {
  try { process.send?.({ status: "error", message: `Uncaught Exception: ${err.message}` }); } catch (_) {}
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  try { process.send?.({ status: "error", message: `Unhandled Rejection: ${reason}` }); } catch (_) {}
  process.exit(1);
});

process.on("disconnect", () => { process.exit(0); });

if (typeof process.send === "function") {
  process.send({ status: "ready" });
}
```
