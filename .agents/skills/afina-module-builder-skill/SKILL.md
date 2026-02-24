---
name: afina-module-builder-skill
description: Designs and creates Afina 1.0.3 compatible modules (settings.json, index.js, package.json) following working patterns from production examples.
license: Proprietary
compatibility: opencode
metadata:
  domain: afina
  language: en
  version: "1.3.1"
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
6. **Axiom of Output Contract**: The module returns exactly one result payload per run. `result` must contain the final business value intended for downstream use. Do not return debug/meta objects or intermediate payloads. If multiple entities are needed, return one array and split/process it downstream using Afina blocks.
7. **Axiom of Waiting Contract**: when opening a new URL, always wait for full page load. Before UI interaction, wait for the target element (default `1000ms`). After UI interaction, apply random wait (default `500-1500ms`).
8. **Axiom of Variable Safety**: Never read `saveTo` or any output key directly via `replacePlaceholders()`. Always wrap the call with a null-guard that falls back to the raw string. `replacePlaceholders` may return `null` for empty strings and on variable resolution errors, silently losing the save target.
9. **Axiom of Diagnostics Logs**: Afina writes runtime logs in its own directory. Use the relative path `data/logs/afina.log` (from Afina root). Do not try to auto-discover the local Afina installation path; request the log file from the user when diagnostics need runtime evidence.

## Working Algorithm

1. **Clarify only when needed (short brief)**:
   - Use an adaptive brief only if uncertainty is medium/high.
   - If uncertainty is low, proceed without questions.
   - Ask at most **3** short, high-impact questions.
   - In each question, provide a recommended default option.
2. **Write the implementation plan**:
   - Create `docs/<module-name>/` in the project root if it does not exist.
   - Write `docs/<module-name>/plan.md` as a roadmap with phase headings and checkboxes inside each phase.
   - Roadmap phases: Settings Design → Logic Implementation → Self-Testing → Output Contract Verification.
   - **Do not start coding until `plan.md` is written.**
3. **Design settings**:
   - Use `camelCase` for `name`.
   - New modules use `"loadTo": true` (boolean). Keep legacy `"loadTo": "true"` only when preserving compatibility with an existing production module.
   - If there is an output, add the `saveTo` field.
   - If complex UI elements are needed (`options`, `isVisible`), peek at the syntax in `best-practices.md`.
4. **Implement logic**:
   - Copy the **entire skeleton from `templates.md`** (it already contains `replacePlaceholders` in the strict `${...}` standard and all global error handlers).
   - Write business logic inside `moduleFunction`.
   - Read via `element.settings.<name>`, write to `savedObjects[saveTo]`.
   - **`utils.js` rule**: For browser modules (Puppeteer), a separate `utils.js` file with the `getCurrentPage` function is **mandatory**. For pure Node.js modules, it's sufficient to keep helper functions directly in `index.js`.
   - **Waiting contract** for browser modules: `openUrlWithFullLoad(...)` for new navigation, `waitForUiElement(...)` before UI action, `waitAfterUiAction(...)` after UI action.
5. **Verify**:
   - Are fields marked with `loadTo` processed via `replacePlaceholders()` (canonical boolean `true`, legacy string `"true"` only when required)?
   - Does `try...catch` return an error to the core?
   - Are wait defaults respected (`1000ms` before interaction, `500-1500ms` after interaction) unless settings explicitly override them?
6. **Self-test after implementation**:
   - Syntax: no obvious JS errors (missing brackets, bad requires, mismatched braces).
   - IPC contract: `process.send({ status: "ready" })` is present at module end.
   - Output contract: `result` is one final payload; if multiple entities are needed, return one array and split it downstream in Afina.
   - Settings consistency: all `settings.json` field `name` values match `element.settings.<name>` reads in code.
   - Report each check inline: `pass` or `fail + reason`.

## Clarification Brief Rules (Adaptive)

Ask a short brief only when decisions materially affect architecture, settings, or UX.

Use a brief when at least one trigger exists:

- goal/result is ambiguous (what should be saved and where);
- runtime choice is unclear (pure Node.js vs Puppeteer);
- user request looks inconsistent/risky (unnecessary browser automation, conflicting settings, fragile logic);
- useful optional settings can improve usability, but choice depends on user intent;
- module name is unclear or generic (required for correct `docs/<module-name>/` directory naming).

Brief constraints:

- maximum **3 questions** total;
- questions must be specific and decision-oriented;
- include a recommended default in each question;
- if defaults are safe, proceed without questions and explicitly state assumptions.

## Bug Report Protocol

When the user reports that a module or function is not working correctly:

1. **Active listening**: ask at most **2** clarifying questions to precisely identify the symptom and its context (what was expected, what actually happened, in which step).
2. **Research**: review the relevant code, `settings.json` field names, IPC flow, and output value.
3. **Request runtime logs when needed**: if the failure cannot be isolated from code/config only, ask the user to provide the Afina log file from `data/logs/afina.log` (relative to Afina root), or a relevant excerpt.
4. **Write bug report** to `docs/<module-name>/bug-<short-slug>.md` with the following structure:
   - **Symptom** — what the user observed vs. what was expected.
   - **Root cause** — identified source of the problem in the code or config.
   - **Fix options** — at least 2 options with trade-offs.
   - **Recommended fix** — chosen option with rationale.
5. **Apply the fix** only after the report file is created.

## Definition of Done

1. **Settings**: `settings.json` contains logical field types, canonical `"loadTo": true` where necessary, and a `saveTo` field for the result. Legacy `"loadTo": "true"` is allowed only for strict backward compatibility.
2. **Read/Write**: The code strictly reads from `element.settings.<name>` and writes the result to `savedObjects[saveTo]`.
3. **Placeholders**: Incoming strings with `loadTo` are parsed by the `replacePlaceholders` function only in `${var}` format. The `{{var}}` format is prohibited.
4. **IPC Lifecycle**: The module responds with `status: "ready"` upon startup, `status: "success"` with the result, and `status: "error"` upon failure.
5. **Process Safety**: At the end of `index.js`, 3 global listeners are strictly present: `uncaughtException`, `unhandledRejection`, `disconnect`.
6. **Browser Security**: The script uses `getCurrentPage()` instead of `browser.pages()[0]`, and correctly releases resources via `browser.disconnect()` (no `browser.close()`).
7. **Browser Waiting Contract**: If a new URL is opened, the module waits for full load; before UI interaction it waits for the element (default `1000ms`), and after UI interaction it applies random wait (default `500-1500ms`).
8. **Adaptive Brief Compliance**: If uncertainty was medium/high, a short brief (max 3 questions) was used before implementation; if uncertainty was low, assumptions were stated briefly.
9. **Output Contract**: `result` and `savedObjects[saveTo]` contain one final business payload (not a debug object and not intermediate payloads). If multiple entities are required, return one array and split it downstream using Afina blocks.
10. **Implementation Plan**: `docs/<module-name>/plan.md` exists and was written before coding started, structured as a roadmap with phase headings and checkboxes.
11. **Variable Safety**: All `saveTo`-style keys are resolved through a null-guard wrapper. The write block includes an explicit `logger.warn` if `saveKey` is empty.
12. **Self-testing**: all self-verifiable checks (syntax, IPC, output contract, settings consistency) were run after implementation and results reported inline.

## Checklist

- [ ] All `name` values from `settings.json` match the paths in JS.
- [ ] `loadTo` in new modules is boolean `true`; legacy string `"true"` is used only for backward compatibility.
- [ ] Input variables (`loadTo`) are passed through `replacePlaceholders()` strictly in the `${...}` format.
- [ ] Output cardinality is explicit: one payload per run; if multiple entities are needed, return one array and split downstream in Afina.
- [ ] `saveTo` and all output keys are read via a null-guard wrapper (not raw `replacePlaceholders`). Warn in log if `saveKey` is empty at write time.
- [ ] **3 global listeners** are added to `index.js`: `uncaughtException`, `unhandledRejection` and `disconnect`.
- [ ] If Puppeteer is used, the browser is disconnected via `browser.disconnect()`, not `browser.close()`.
- [ ] Browser wait contract is implemented: full load on new URL, `1000ms` default pre-action element wait, `500-1500ms` default random post-action wait.
- [ ] `docs/<module-name>/plan.md` created before coding started.
- [ ] Self-test results reported inline (syntax, IPC, output contract, settings consistency).

## Response Format

Always provide:

1. List of files.
2. Logic explanation.
3. Brief decisions/assumptions (only if relevant).
4. npm installation commands (if any).
5. Import instructions for Afina.

---

## References

Extra technical information (MUST BE STUDIED DURING CREATION):

- Code templates: `references/templates.md` (contains the reference index.js and settings.json)
- Patterns and anti-patterns: `references/best-practices.md` (working with Puppeteer, UI Builder, Timeout)
- Afina runtime log path (relative to Afina root): `data/logs/afina.log` (request from user when needed)
