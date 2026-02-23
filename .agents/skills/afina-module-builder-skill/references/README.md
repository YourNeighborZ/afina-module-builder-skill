# References for afina-module-builder

This folder contains ready-to-use examples and best practices for building Afina modules.

Baseline compatibility target: production modules from Afina 1.0.3 (`D:\temp\Afina 1.0.3\data\modules`).

## Structure
- `templates.md` - Base templates for `settings.json` and `index.js` (including global error handlers).
- `best-practices.md` - Advanced Puppeteer patterns, UI constructor syntax (isVisible, options), timeout helpers, and common anti-patterns.
- `canonical/utils.js` - canonical browser helper (`replacePlaceholders`, `delay`, `connectToBrowser`, `getCurrentPage`).
- `examples/01_minimal-node/` - module without browser, pure Node.js logic.
- `examples/02_browser-puppeteer/` - browser module with `wsEndpoint`, safe IPC, and timeouts.
- `examples/03_settings-fix-from-nousresearch/` - before/after compatibility-safe improvements of a real settings file.

Use these files as templates when generating new modules.

Global consistency rules in this folder:

- Placeholder format is strictly `${...}`.
- New modules use `"loadTo": true`; legacy `"loadTo": "true"` is only for backward compatibility.
- `result` must be a final business value for downstream nodes.
