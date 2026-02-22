---
name: afina-module-builder-skill
description: Designs and creates Afina 1.0.3 compatible modules (settings.json, index.js, package.json) following working patterns from production examples.
license: Proprietary
compatibility: opencode
metadata:
  domain: afina
  language: en
  version: "1.0"
---

## Usage Context

Afina scenarios are built as visual graphs. A **Module** is a custom block (`executeModule`) that receives data (`savedObjects`), performs a task, and saves the result (`saveTo`). We create this `black-box` module.

## What I Do

- Assemble the module `settings.json` -> `index.js` -> `package.json`.
- Maintain the correspondence between UI settings and code reading.
- Ensure compatibility with the Afina IPC core, including process termination listeners.
- Rely on reference implementations from `references/templates.md` and rules from `references/best-practices.md`.

## Axioms (Strict)

1. **Axiom of Unity**: fields from `settings.json` are read in the code strictly via `element.settings.<name>`.
2. **Axiom of Isolation**: the module is completely autonomous, dependencies reside in `package.json`.
3. **Axiom of Resources**: the browser (`puppeteer`) is launched only if a real DOM is needed (clicks, iframe, rendering). Node.js is sufficient for API/parsing.
4. **Axiom of the Core**: the utility block `process.on("message")` is untouchable. **Global handlers are mandatory**: `uncaughtException`, `unhandledRejection` and `disconnect` (preventing zombie processes).
5. **Axiom of Tabs**: when working with Puppeteer **never use `pages[0]` blindly**, always search for the active visible tab via `getCurrentPage()`.

## Working Algorithm

1. **Design settings**:
   - Use `camelCase` for `name`.
   - If there is an output, add the `saveTo` field.
   - If complex UI elements are needed (`options`, `isVisible`), peek at the syntax in `best-practices.md`.
2. **Implement logic**:
   - Copy the **entire skeleton from `templates.md`** (it already contains `replacePlaceholders` in the strict `${...}` standard and all global error handlers).
   - Write business logic inside `moduleFunction`.
   - Read via `element.settings.<name>`, write to `savedObjects[saveTo]`.
   - **`utils.js` rule**: For browser modules (Puppeteer), a separate `utils.js` file with the `getCurrentPage` function is **mandatory**. For pure Node.js modules, it's sufficient to keep helper functions directly in `index.js`.
3. **Verify**:
   - Is `loadTo: true` processed via `replacePlaceholders()`?
   - Does `try...catch` return an error to the core?

## Definition of Done

1. **Settings**: `settings.json` contains logical field types, `loadTo` where necessary, and a `saveTo` field for the result.
2. **Read/Write**: The code strictly reads from `element.settings.<name>` and writes the result to `savedObjects[saveTo]`.
3. **Placeholders**: Incoming strings with `loadTo` are parsed by the `replacePlaceholders` function only in `${var}` format. The `{{var}}` format is prohibited.
4. **IPC Lifecycle**: The module responds with `status: "ready"` upon startup, `status: "success"` with the result, and `status: "error"` upon failure.
5. **Process Safety**: At the end of `index.js`, 3 global listeners are strictly present: `uncaughtException`, `unhandledRejection`, `disconnect`.
6. **Browser Security**: The script uses `getCurrentPage()` instead of `browser.pages()[0]`, and correctly releases resources via `browser.disconnect()` (no `browser.close()`).

## Checklist

- [ ] All `name` values from `settings.json` match the paths in JS.
- [ ] Input variables (`loadTo`) are passed through `replacePlaceholders()` strictly in the `${...}` format.
- [ ] **3 global listeners** are added to `index.js`: `uncaughtException`, `unhandledRejection` and `disconnect`.
- [ ] If Puppeteer is used, the browser is disconnected via `browser.disconnect()`, not `browser.close()`.

## Response Format

Always provide:

1. List of files.
2. Logic explanation.
3. npm installation commands (if any).
4. Import instructions for Afina.

---

## References

Extra technical information (MUST BE STUDIED DURING CREATION):

- Code templates: `references/templates.md` (contains the reference index.js and settings.json)
- Patterns and anti-patterns: `references/best-practices.md` (working with Puppeteer, UI Builder, Timeout)
