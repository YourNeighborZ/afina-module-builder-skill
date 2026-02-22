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
