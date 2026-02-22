const puppeteer = require("puppeteer-core");

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
  warn: (message) => process.send && process.send({ type: "log", level: "warn", message }),
  error: (message) => process.send && process.send({ type: "log", level: "error", message }),
  debug: (message) => process.send && process.send({ type: "log", level: "debug", message })
});

const getCurrentPage = async (browser) => {
  const pages = await browser.pages();
  if (!pages.length) {
    throw new Error("No available pages in browser");
  }

  const regularPages = pages.filter((page) => {
    try {
      if (page.isClosed()) return false;
      const url = page.url() || "";
      return (
        !url.startsWith("chrome-extension://") &&
        !url.startsWith("moz-extension://") &&
        !url.startsWith("about:") &&
        !url.startsWith("chrome://") &&
        !url.startsWith("edge://")
      );
    } catch (_) {
      return false;
    }
  });

  for (const page of regularPages) {
    const isVisible = await page.evaluate(() => !document.hidden);
    if (isVisible) return page;
  }

  return regularPages[0] || pages[0];
};

const readTextBySelectorOrXpath = async (page, selector, xpath) => {
  if (selector) {
    const handle = await page.$(selector);
    if (handle) {
      const text = await page.evaluate((el) => (el.textContent || "").trim(), handle);
      if (text) return text;
    }
  }

  if (xpath) {
    const nodes = await page.$x(xpath);
    if (nodes.length > 0) {
      const text = await page.evaluate((el) => (el.textContent || "").trim(), nodes[0]);
      if (text) return text;
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

  const rawSelector = getSetting(element, "targetSelector", "h1");
  const rawXpath = getSetting(element, "targetXpath", "//h1");
  const timeoutMsRaw = getSetting(element, "timeoutMs", 10000);
  const timeoutMs = Number.isFinite(Number(timeoutMsRaw)) ? Number(timeoutMsRaw) : 10000;
  const rawSaveTo = getSetting(element, "saveTo", "");

  const selector = replacePlaceholders(rawSelector, savedObjects);
  const xpath = replacePlaceholders(rawXpath, savedObjects);
  const saveTo = replacePlaceholders(rawSaveTo, savedObjects);

  logger.debug(`Query selector='${selector}', xpath='${xpath}', timeoutMs=${timeoutMs}`);

  const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });

  try {
    const page = await getCurrentPage(browser);

    const text = await withTimeout(
      readTextBySelectorOrXpath(page, selector, xpath),
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
