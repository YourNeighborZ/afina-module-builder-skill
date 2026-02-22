const getSetting = (element, name, fallback = "") => {
  const settings = (element && element.settings) || {};
  if (settings[name] !== undefined) return settings[name];
  return fallback;
};

const replacePlaceholders = (value, savedObjects) => {
  if (typeof value !== "string") return value;
  return value
    .replace(/\$\{([^}]+)\}/g, (_, variable) => {
      const key = String(variable || "").trim();
      const replacement = savedObjects && key in savedObjects ? savedObjects[key] : "";
      return replacement === undefined || replacement === null ? "" : String(replacement);
    })
    .replace(/\{\{([^}]+)\}\}/g, (_, variable) => {
      const key = String(variable || "").trim();
      const replacement = savedObjects && key in savedObjects ? savedObjects[key] : "";
      return replacement === undefined || replacement === null ? "" : String(replacement);
    });
};

const createLogger = () => ({
  info: (message) => process.send && process.send({ type: "log", level: "info", message }),
  warn: (message) => process.send && process.send({ type: "log", level: "warn", message }),
  error: (message) => process.send && process.send({ type: "log", level: "error", message })
});

const transformText = (inputText, operation) => {
  const text = String(inputText || "");
  switch (operation) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "length":
      return text.length;
    case "trim":
    default:
      return text.trim();
  }
};

const moduleFunction = async (element, savedObjects) => {
  const logger = createLogger();

  try {
    const rawInputText = getSetting(element, "inputText", "");
    const rawOperation = getSetting(element, "operation", "trim");
    const rawSaveTo = getSetting(element, "saveTo", "");

    const inputText = replacePlaceholders(rawInputText, savedObjects);
    const operation = replacePlaceholders(rawOperation, savedObjects);
    const saveTo = replacePlaceholders(rawSaveTo, savedObjects);

    const result = transformText(inputText, operation);

    if (saveTo && savedObjects && typeof savedObjects === "object") {
      savedObjects[saveTo] = result;
      logger.info(`Result saved to variable: ${saveTo}`);
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
    process.send && process.send({ status: "success", result });
  } catch (err) {
    process.send && process.send({ status: "error", message: err.message, stack: err.stack });
  }
});

process.on("uncaughtException", (err) => {
  try {
    process.send && process.send({ status: "error", message: err.message });
  } catch (_) {}
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  try {
    process.send && process.send({ status: "error", message: `Unhandled Rejection: ${reason}` });
  } catch (_) {}
  process.exit(1);
});

process.on("disconnect", () => {
  process.exit(0);
});

if (typeof process.send === "function") {
  process.send({ status: "ready" });
}
