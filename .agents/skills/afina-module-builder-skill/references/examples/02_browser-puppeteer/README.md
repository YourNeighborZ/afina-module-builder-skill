# 02 browser-puppeteer

Example of a browser module for Afina when the task cannot be solved without DOM access.

## What this example shows

- Checking `wsEndpoint` before connecting.
- Connecting via `puppeteer-core` to an already running browser.
- Finding the active page.
- Opening optional `targetUrl` with full page-load wait.
- Safely reading text by CSS and XPath.
- Timeout via `Promise.race`.
- Waiting for target element before UI interaction (`1000ms` default).
- Random pause after UI interaction (`500-1500ms` default).
- `browser.disconnect()` instead of `browser.close()`.
- Reading parameters from `element.settings.*` and writing results via `saveTo`.
- Using a separate `utils.js` with canonical `getCurrentPage` for safe active-tab detection.
