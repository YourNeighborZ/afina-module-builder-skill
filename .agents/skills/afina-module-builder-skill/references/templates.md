# Afina Script Module Templates

Use these templates for Afina Script Modules only.

## `settings.json` Rules

- Supported field properties used by this skill: `name`, `label`, `type`, `default`, `loadTo`, `options`, `groupId`, `isVisible`.
- Use `camelCase` field names.
- New modules use `"loadTo": true` on input fields that accept `${var}` values.
- Never add `loadTo` to `saveTo`.
- Node.js modules: place `saveTo` first.
- Browser modules: place `saveTo` last with `"groupId": "output"`.

## `settings.json` - Node.js Module

```json
{
  "type": "Extract Word",
  "fields": [
    {
      "name": "saveTo",
      "label": "Сохранить результат в переменную",
      "type": "text",
      "default": ""
    },
    {
      "name": "phrase",
      "label": "Фраза",
      "type": "text",
      "default": "",
      "loadTo": true
    },
    {
      "name": "position",
      "label": "Номер слова",
      "type": "number",
      "default": "1",
      "loadTo": true
    }
  ]
}
```

## `settings.json` - Browser Module

```json
{
  "type": "Read Page Text",
  "fields": [
    {
      "name": "targetUrl",
      "label": "URL для открытия (опционально)",
      "type": "text",
      "default": "",
      "loadTo": true,
      "groupId": "query"
    },
    {
      "name": "targetSelector",
      "label": "CSS селектор элемента",
      "type": "text",
      "default": "h1",
      "loadTo": true,
      "groupId": "query"
    },
    {
      "name": "uiElementWaitMs",
      "label": "Ожидание элемента (мс)",
      "type": "number",
      "default": "1000",
      "groupId": "query"
    },
    {
      "name": "delay",
      "label": "Задержка от (мс)",
      "type": "number",
      "default": "500",
      "groupId": "delay"
    },
    {
      "name": "delay2",
      "label": "Задержка до (мс)",
      "type": "number",
      "default": "1500",
      "groupId": "delay"
    },
    {
      "name": "description",
      "label": "Описание",
      "type": "text",
      "default": ""
    },
    {
      "name": "saveTo",
      "label": "Сохранить результат в переменную",
      "type": "text",
      "default": "",
      "groupId": "output"
    }
  ]
}
```

## `index.js` - Node.js Template

```javascript
const replacePlaceholders = (value, savedObjects) => {
  if (typeof value !== "string") return value;
  return value.replace(/\$\{([^}]+)\}/g, (_, variable) => {
    const key = String(variable || "").trim();
    const replacement = savedObjects && key in savedObjects ? savedObjects[key] : "";
    return replacement === undefined || replacement === null ? "" : String(replacement);
  });
};

const readKey = (raw, savedObjects) => {
  if (!raw) return "";
  const resolved = replacePlaceholders(raw, savedObjects);
  return resolved !== null && resolved !== undefined ? String(resolved) : String(raw);
};

const moduleFunction = async (element, savedObjects) => {
  const logger = {
    info: (message) => process.send?.({ type: "log", level: "info", message }),
    warn: (message) => process.send?.({ type: "log", level: "warn", message }),
    error: (message) => process.send?.({ type: "log", level: "error", message }),
  };

  try {
    const settings = element?.settings || {};
    const inputText = replacePlaceholders(settings.inputText ?? "", savedObjects);
    const saveTo = readKey(settings.saveTo ?? "", savedObjects);

    const result = String(inputText).trim();

    if (saveTo && savedObjects && typeof savedObjects === "object") {
      savedObjects[saveTo] = result;
    } else {
      logger.warn("saveTo is empty or savedObjects unavailable - result NOT saved.");
    }

    return result;
  } catch (error) {
    logger.error(`Module error: ${error.message}`);
    throw error;
  }
};

process.on("message", async (msg) => {
  try {
    const result = await moduleFunction(msg.payload.element, msg.payload.savedObjects);
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

## `index.js` - Browser Module

For browser modules:

- copy `references/canonical/utils.js` as `utils.js`;
- import it with `require("./utils")`;
- connect with Afina `wsEndpoint`;
- use `getCurrentPage()`;
- use `readKey(...)` for `saveTo`.

See `references/examples/02_browser-puppeteer/` for the smallest working browser example.
