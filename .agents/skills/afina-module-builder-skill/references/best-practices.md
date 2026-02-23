# Advanced Patterns and Anti-Patterns

## Advanced Browser Automation Patterns (Puppeteer)

Based on best practices from the `browser-use` and `agent-browser` ecosystem, observe the following rules when working with the DOM via Puppeteer in Afina modules:

1. **Reliable Waits:** Avoid hard timeouts like `setTimeout` (use only as a fallback).
   - Wait for network idle on heavy pages: `await page.waitForNavigation({ waitUntil: 'networkidle2' })`
   - Wait for specific elements to appear before interaction: `await page.waitForSelector('.my-class', { visible: true })`
   - Wait for JS state: `await page.waitForFunction('document.readyState === "complete"')`
2. **Safe Evaluate:** When executing scripts on the page (`page.evaluate`), **never** concatenate strings to pass variables. Always pass them as context arguments: `await page.evaluate((val) => document.title = val, myValue);`
3. **Bypassing Shadow DOM / iframe:**
   - To search within an iframe, find the target frame by URL: `const frame = page.frames().find(f => f.url().includes('login'));`
   - For Shadow DOM, use Puppeteer piercing selectors (e.g., `>>>`) or execute logic within `evaluate`.
4. **Finding Active Tab (Critical):** Using `browser.pages()[0]` is strictly prohibited, as in Afina this can often be a background extension tab (offscreen.html or about:blank). Always use `utils.js` sourced verbatim from `references/canonical/utils.js` — never rewrite it manually. The canonical file exports `getCurrentPage` (and also `replacePlaceholders`, `delay`, `openUrlWithFullLoad`, `waitForUiElement`, `waitAfterUiAction`, `connectToBrowser`). In pure Node.js modules, `utils.js` is not required.
5. **Human-like Interaction (Anti-bot):** To avoid blocks (e.g., Cloudflare), add a delay when typing text: `await page.type('#input', text, { delay: Math.floor(Math.random() * 50) + 50 })`.
6. **Handling Race Conditions in React/Vue:** When observing the DOM (via `MutationObserver`), containers often appear on screen empty, and text loads fractions of a second later. **Never set a "processed" marker (e.g., data-counted="true") before the element's `innerText` is no longer an empty string.** Otherwise, the module will miss the actual data appearance. Always add a check `if (!el.innerText.trim()) return;`.
7. **Safe Disconnection:** At the end of the module's work or in a `finally` block, be sure to call `await browser.disconnect();`. Do not use `browser.close()` to avoid terminating the entire browser process in which the Afina scenario is running.

## Navigation and UI Waiting Contract (Required)

For browser modules, always follow this flow:

1. **Open URL with full load wait**
   - If the module opens a new URL, call `openUrlWithFullLoad(page, url, timeoutMs)`.
   - This must wait for both `networkidle2` and `document.readyState === "complete"`.
2. **Wait element before UI action**
   - Before click/type/hover/evaluate on target element, call `waitForUiElement(...)`.
   - Default pre-action timeout: `1000ms`.
3. **Random delay after UI action**
   - After each UI interaction, call `waitAfterUiAction(...)`.
   - Default jitter range: `500-1500ms`.

Recommended defaults:

- `uiElementWaitMs`: `1000`
- `postActionWaitMinMs`: `500`
- `postActionWaitMaxMs`: `1500`
- `navigationTimeoutMs`: `30000`

## Anti-patterns and Fixes (Must Check)

- Canonical format for new modules: `"loadTo": true` (boolean). Legacy `"loadTo": "true"` is acceptable only when preserving compatibility with an unchanged production contract.
- Reading fields not from `element.settings` -> the module won't see data from the builder.
- Renaming `saveTo` to `save_to` without updating logic -> loss of result.
- Mixing placeholder formats: only `${var}` is allowed in the strict standard. Using `{{var}}` is considered a configuration error.
- Forcing `type` replacement to `"module"` in an already working module -> UX/categorization breakdown risk.
- Removing a working pattern `loadTo: "true"` without checking core version compatibility.
- Using the browser for tasks solvable by pure Node.js.
- Opening new URL and interacting immediately without waiting for full page load.
- Clicking/typing without explicit element wait, or using fixed post-action sleep instead of randomized `500-1500ms` by default.
- **Lack of global handlers (uncaughtException, unhandledRejection, disconnect)** -> hanging child processes in the operating system.

## Variable Save Pattern (saveTo)

### Problem: `replacePlaceholders` can return `null`

`replacePlaceholders` from `utils.js` / `utils_84.js` can return `null` in common edge cases:

1. Input string is empty (`""`) -> early `null`
2. Variable resolution fails inside `${...}` -> `hasError = true`, final resolved key can become `null`

**Consequence:** if `saveTo` is unresolved or empty, write block condition fails and result is silently not saved.

### Required pattern for reading `saveTo`

Never read output keys via raw `replacePlaceholders(...)`. Always use a null-guard wrapper:

```javascript
const readKey = (raw, savedObjects) => {
  if (!raw) return '';
  const resolved = replacePlaceholders(raw, savedObjects);
  return resolved !== null && resolved !== undefined ? String(resolved) : String(raw);
};

const saveTo = readKey(settings.saveTo ?? '', savedObjects);
```

### Required pattern for writing result

```javascript
if (saveTo && savedObjects && typeof savedObjects === 'object') {
  savedObjects[saveTo] = result;
  logger.info(`Saved to "${saveTo}": ${result}`);
} else {
  logger.warn('saveTo is empty or savedObjects unavailable - result NOT saved.');
}
```

Explicit `logger.warn` is mandatory so variable-loss is visible in logs.

## Error and Timeout Handling

- For potentially long asynchronous operations (network requests, waiting for selectors), use `Promise.race` with an explicit timeout.
- Do not use a single global timeout for the entire module; break down the waiting by steps.

**Example of a safe timeout:**

```javascript
const withTimeout = (promise, timeoutMs, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeoutMs),
    ),
  ]);
```

## Advanced settings.json Syntax (Afina Builder)

In addition to basic fields (`name`, `label`, `type`, `default`, `loadTo`), the Afina builder interface supports advanced settings to improve UX:

1. **Dependent Fields (Conditional Visibility - `isVisible`)**
   Allows hiding/showing fields based on values of other fields.
   Syntax — a string JS-like expression where variables are names of other fields.
   Example: `"isVisible": "actionType === 'start'"` (the field will be visible only if the `'start'` value is selected in the `actionType` field).

2. **Dropdown Lists (`options` property for `select` type)**
   If `type: "select"`, it's strictly necessary to pass an `options` array.
   Example: `"options": [ { "label": "Start", "value": "start" }, { "label": "Stop", "value": "stop" } ]`

3. **Field Grouping (`groupId` property)**
   Allows visualizing settings into blocks.
   Example: `"groupId": "settings"` or `"groupId": "output"`.
