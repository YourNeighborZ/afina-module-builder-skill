# 02 browser-puppeteer

Example of a browser module for Afina when the task cannot be solved without DOM access.

## What this example shows

- Checking `wsEndpoint` before connecting.
- Connecting via `puppeteer-core` to an already running browser.
- Finding the active page.
- Safely reading text by CSS and XPath.
- Timeout via `Promise.race`.
- `browser.disconnect()` instead of `browser.close()`.
- Reading parameters from `element.settings.*` and writing results via `saveTo`.
