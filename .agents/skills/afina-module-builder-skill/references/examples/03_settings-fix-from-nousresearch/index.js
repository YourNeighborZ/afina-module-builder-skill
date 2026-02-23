const getSetting = (element, name, fallback = "") => {
  const settings = (element && element.settings) || {};
  if (settings[name] !== undefined) return settings[name];
  return fallback;
};

const replacePlaceholders = (value, savedObjects) => {
  if (typeof value !== "string") return value;
  return value.replace(/\$\{([^}]+)\}/g, (_, variable) => {
    const key = String(variable || "").trim();
    const replacement = savedObjects && key in savedObjects ? savedObjects[key] : "";
    return replacement === undefined || replacement === null ? "" : String(replacement);
  });
};

const createLogger = () => ({
  info: (message) => process.send && process.send({ type: "log", level: "info", message }),
  error: (message) => process.send && process.send({ type: "log", level: "error", message })
});

const moduleFunction = async (element, savedObjects) => {
  const logger = createLogger();

  try {
    const model = replacePlaceholders(getSetting(element, "model", "Hermes-3-Llama-3.1-70B"), savedObjects);
    const apiKey = replacePlaceholders(getSetting(element, "api", ""), savedObjects);
    const requestText = replacePlaceholders(getSetting(element, "request", ""), savedObjects);
    const maxTokens = Number(getSetting(element, "maxTokens", "256")) || 256;
    const saveTo = replacePlaceholders(getSetting(element, "saveTo", ""), savedObjects);

    const normalizedRequest = String(requestText).trim();

    if (!normalizedRequest) {
      throw new Error("request is required");
    }

    logger.info(`Using model=${model}, maxTokens=${maxTokens}, apiKeyProvided=${Boolean(apiKey)}`);

    const result = normalizedRequest;

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
    process.send && process.send({ status: "error", message: `Uncaught Exception: ${err.message}` });
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
