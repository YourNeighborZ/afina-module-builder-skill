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

`loadTo` policy:

- Use `"loadTo": true` (boolean) in all new modules.
- Keep legacy `"loadTo": "true"` only when updating existing production modules that rely on the old format.

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

const readKey = (raw, savedObjects) => {
  if (!raw) return '';
  const resolved = replacePlaceholders(raw, savedObjects);
  return resolved !== null && resolved !== undefined ? String(resolved) : String(raw);
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
    const saveTo = readKey(settings.saveTo ?? '', savedObjects);

    const result = String(inputText).trim();

    if (saveTo && savedObjects && typeof savedObjects === "object") {
      savedObjects[saveTo] = result;
    } else {
      logger.warn('saveTo is empty or savedObjects unavailable - result NOT saved.');
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

It exports: `replacePlaceholders`, `delay`, `openUrlWithFullLoad`, `waitForUiElement`, `waitAfterUiAction`, `connectToBrowser`, `getCurrentPage`, and default wait constants.

Default waiting contract for browser modules:

- opening a new URL: full-load wait (`networkidle2` + `document.readyState === "complete"`);
- before UI action: element wait `1000ms` by default;
- after UI action: random wait `500-1500ms` by default.

In `index.js`, require it as:

```javascript
const {
  replacePlaceholders,
  getCurrentPage,
  connectToBrowser,
  openUrlWithFullLoad,
  waitForUiElement,
  waitAfterUiAction,
  DEFAULT_UI_ELEMENT_WAIT_MS,
  DEFAULT_POST_ACTION_WAIT_MIN_MS,
  DEFAULT_POST_ACTION_WAIT_MAX_MS,
} = require('./utils');
```

### `index.js` Skeleton — Puppeteer module (IPC-safe)

```javascript
const {
  replacePlaceholders,
  getCurrentPage,
  connectToBrowser,
  openUrlWithFullLoad,
  waitForUiElement,
  waitAfterUiAction,
  DEFAULT_UI_ELEMENT_WAIT_MS,
  DEFAULT_POST_ACTION_WAIT_MIN_MS,
  DEFAULT_POST_ACTION_WAIT_MAX_MS,
} = require('./utils');

const readKey = (raw, savedObjects) => {
  if (!raw) return '';
  const resolved = replacePlaceholders(raw, savedObjects);
  return resolved !== null && resolved !== undefined ? String(resolved) : String(raw);
};

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
  const saveTo = readKey(settings.saveTo ?? '', savedObjects);
  const targetUrl = replacePlaceholders(settings.targetUrl ?? "", savedObjects);
  const targetSelector = replacePlaceholders(settings.targetSelector ?? "", savedObjects);
  const targetXpath = replacePlaceholders(settings.targetXpath ?? "", savedObjects);
  const uiElementWaitMs = Number(settings.uiElementWaitMs ?? DEFAULT_UI_ELEMENT_WAIT_MS);
  const postActionWaitMinMs = Number(settings.postActionWaitMinMs ?? DEFAULT_POST_ACTION_WAIT_MIN_MS);
  const postActionWaitMaxMs = Number(settings.postActionWaitMaxMs ?? DEFAULT_POST_ACTION_WAIT_MAX_MS);

  const browser = await connectToBrowser(wsEndpoint);

  try {
    const page = await getCurrentPage(browser);

    if (targetUrl) {
      await openUrlWithFullLoad(page, targetUrl);
    }

    const targetHandle = await waitForUiElement(page, {
      selector: targetSelector,
      xpath: targetXpath,
      timeoutMs: uiElementWaitMs,
      visible: true,
    });

    // --- put business logic here ---
    const result = await page.evaluate(
      (el) => (el?.textContent || '').trim(),
      targetHandle,
    );

    await waitAfterUiAction(postActionWaitMinMs, postActionWaitMaxMs);

    if (saveTo && savedObjects && typeof savedObjects === "object") {
      savedObjects[saveTo] = result;
    } else {
      logger.warn('saveTo is empty or savedObjects unavailable - result NOT saved.');
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
