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
4. **Finding Active Tab (Critical):** Using `browser.pages()[0]` is strictly prohibited, as in Afina this can often be a background extension tab (offscreen.html or about:blank). Instead, it's necessary to include the `utils.js` file (strictly **required** for all modules working with the browser) with the `getCurrentPage` function, which filters out service pages and checks tab visibility via `!document.hidden`. In pure Node.js modules, the `utils.js` file is not required (functions can be kept in `index.js`).
5. **Human-like Interaction (Anti-bot):** To avoid blocks (e.g., Cloudflare), add a delay when typing text: `await page.type('#input', text, { delay: Math.floor(Math.random() * 50) + 50 })`.
6. **Handling Race Conditions in React/Vue:** When observing the DOM (via `MutationObserver`), containers often appear on screen empty, and text loads fractions of a second later. **Never set a "processed" marker (e.g., data-counted="true") before the element's `innerText` is no longer an empty string.** Otherwise, the module will miss the actual data appearance. Always add a check `if (!el.innerText.trim()) return;`.
7. **Safe Disconnection:** At the end of the module's work or in a `finally` block, be sure to call `await browser.disconnect();`. Do not use `browser.close()` to avoid terminating the entire browser process in which the Afina scenario is running.

## Anti-patterns and Fixes (Must Check)

- Reading fields not from `element.settings` -> the module won't see data from the builder.
- Renaming `saveTo` to `save_to` without updating logic -> loss of result.
- Mixing placeholder formats: only `${var}` is allowed in the strict standard. Using `{{var}}` is considered a configuration error.
- Forcing `type` replacement to `"module"` in an already working module -> UX/categorization breakdown risk.
- Removing a working pattern `loadTo: "true"` without checking core version compatibility.
- Using the browser for tasks solvable by pure Node.js.
- **Lack of global handlers (uncaughtException, unhandledRejection, disconnect)** -> hanging child processes in the operating system.

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
