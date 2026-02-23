const {
  replacePlaceholders,
  getCurrentPage,
  connectToBrowser,
  openUrlWithFullLoad,
  waitForUiElement,
  waitAfterUiAction,
  DEFAULT_UI_ELEMENT_WAIT_MS,
  DEFAULT_POST_ACTION_WAIT_MIN_MS,
  DEFAULT_POST_ACTION_WAIT_MAX_MS
} = require('./utils');

const getSetting = (element, name, fallback = "") => {
  const settings = (element && element.settings) || {};
  if (settings[name] !== undefined) return settings[name];
  return fallback;
};

const createLogger = () => ({
  info: (message) => process.send && process.send({ type: "log", level: "info", message }),
  warn: (message) => process.send && process.send({ type: "log", level: "warn", message }),
  error: (message) => process.send && process.send({ type: "log", level: "error", message }),
  debug: (message) => process.send && process.send({ type: "log", level: "debug", message })
});

const readTextBySelectorOrXpath = async (
  page,
  selector,
  xpath,
  uiElementWaitMs,
  postActionWaitMinMs,
  postActionWaitMaxMs
) => {
  if (selector) {
    try {
      const handle = await waitForUiElement(page, {
        selector,
        timeoutMs: uiElementWaitMs,
        visible: true
      });

      if (handle) {
        const text = await page.evaluate((el) => (el.textContent || "").trim(), handle);
        await waitAfterUiAction(postActionWaitMinMs, postActionWaitMaxMs);
        if (text) return text;
      }
    } catch (_) {
      // Fallback to XPath below.
    }
  }

  if (xpath) {
    try {
      await waitForUiElement(page, {
        xpath,
        timeoutMs: uiElementWaitMs,
        visible: true
      });

      const nodes = await page.$x(xpath);
      if (nodes.length > 0) {
        const text = await page.evaluate((el) => (el.textContent || "").trim(), nodes[0]);
        await waitAfterUiAction(postActionWaitMinMs, postActionWaitMaxMs);
        if (text) return text;
      }
    } catch (_) {
      // No-op. Empty result is handled by caller.
    }
  }

  return "";
};

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs))
  ]);
};

const moduleFunction = async (element, savedObjects, _connections, _elementMap, _currentElementId, _uuid, _port, wsEndpoint) => {
  const logger = createLogger();

  if (!wsEndpoint) {
    throw new Error("wsEndpoint not provided. Start browser before using this module.");
  }

  const rawTargetUrl = getSetting(element, "targetUrl", "");
  const rawSelector = getSetting(element, "targetSelector", "h1");
  const rawXpath = getSetting(element, "targetXpath", "//h1");
  const timeoutMsRaw = getSetting(element, "timeoutMs", 10000);
  const uiElementWaitMsRaw = getSetting(element, "uiElementWaitMs", DEFAULT_UI_ELEMENT_WAIT_MS);
  const postActionWaitMinMsRaw = getSetting(element, "postActionWaitMinMs", DEFAULT_POST_ACTION_WAIT_MIN_MS);
  const postActionWaitMaxMsRaw = getSetting(element, "postActionWaitMaxMs", DEFAULT_POST_ACTION_WAIT_MAX_MS);
  const timeoutMs = Number.isFinite(Number(timeoutMsRaw)) ? Number(timeoutMsRaw) : 10000;
  const uiElementWaitMs = Number.isFinite(Number(uiElementWaitMsRaw))
    ? Number(uiElementWaitMsRaw)
    : DEFAULT_UI_ELEMENT_WAIT_MS;
  const postActionWaitMinMs = Number.isFinite(Number(postActionWaitMinMsRaw))
    ? Number(postActionWaitMinMsRaw)
    : DEFAULT_POST_ACTION_WAIT_MIN_MS;
  const postActionWaitMaxMs = Number.isFinite(Number(postActionWaitMaxMsRaw))
    ? Number(postActionWaitMaxMsRaw)
    : DEFAULT_POST_ACTION_WAIT_MAX_MS;
  const rawSaveTo = getSetting(element, "saveTo", "");

  const targetUrl = replacePlaceholders(rawTargetUrl, savedObjects);
  const selector = replacePlaceholders(rawSelector, savedObjects);
  const xpath = replacePlaceholders(rawXpath, savedObjects);
  const saveTo = replacePlaceholders(rawSaveTo, savedObjects);

  logger.debug(
    `Query url='${targetUrl || "<current>"}', selector='${selector}', xpath='${xpath}', timeoutMs=${timeoutMs}, uiElementWaitMs=${uiElementWaitMs}, postActionWaitMs=${postActionWaitMinMs}-${postActionWaitMaxMs}`
  );

  const browser = await connectToBrowser(wsEndpoint);

  try {
    const page = await getCurrentPage(browser);

    if (targetUrl) {
      await withTimeout(
        openUrlWithFullLoad(page, targetUrl, timeoutMs),
        timeoutMs,
        "Opening URL timeout"
      );
    }

    const text = await withTimeout(
      readTextBySelectorOrXpath(
        page,
        selector,
        xpath,
        uiElementWaitMs,
        postActionWaitMinMs,
        postActionWaitMaxMs
      ),
      timeoutMs,
      "Reading text timeout"
    );

    if (!text) {
      throw new Error("Target element text is empty or element not found");
    }

    if (saveTo && savedObjects && typeof savedObjects === "object") {
      savedObjects[saveTo] = text;
      logger.info(`Result saved to variable: ${saveTo}`);
    }

    return text;
  } catch (error) {
    logger.error(`Module error: ${error.message}`);
    throw error;
  } finally {
    try {
      browser.disconnect();
    } catch (_) {}
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
      msg.payload.wsEndpoint
    );
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
