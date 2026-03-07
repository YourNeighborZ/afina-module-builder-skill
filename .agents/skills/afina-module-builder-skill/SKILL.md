---
name: afina-module-builder-skill
description: >
  Builds Afina Script Modules (`executeModule`) by producing `settings.json`,
  `index.js`, and `package.json` from working Script Module patterns. This skill
  is only for Script Modules. Do not use it for Trigger modules.
license: Proprietary
compatibility: opencode
metadata:
  domain: afina
  language: en
  version: "2.0.0"
---

## Scope

- Use this skill only for Afina Script Modules (`executeModule`).
- A Script Module is part of a Script chain, reads inputs from `element.settings`, can use `savedObjects`, and may save one result into `savedObjects[saveTo]`.
- Do not use this skill for Trigger modules. Triggers are cron-driven, not part of the Script chain, do not use `saveTo`, return data to the Trigger system instead of `savedObjects`, and manage their own browser lifecycle.

## Core Contract

1. A module consists of `settings.json`, `index.js`, and `package.json`.
2. Every setting is read only from `element.settings.<name>`.
3. The IPC wrapper must stay intact: `process.on("message")`, `status: "ready"`, `status: "success"`, `status: "error"`.
4. Global handlers are mandatory: `uncaughtException`, `unhandledRejection`, `disconnect`.
5. Use `${var}` placeholders only.
6. New modules use `"loadTo": true` only on input fields that accept Afina variables.
7. Never add `loadTo` to `saveTo`.
8. The module returns one final business result per run.

## Build Rules

- Start from `references/templates.md`.
- Keep `settings.json` and `index.js` in sync: every field `name` must match the code path `element.settings.<name>`.
- For Node.js modules, place `saveTo` first.
- For browser modules, place `saveTo` last with `"groupId": "output"`.
- For browser modules, copy `references/canonical/utils.js` as `utils.js`.
- For browser modules, never use `browser.pages()[0]`; use `getCurrentPage()`.
- For browser modules, disconnect with `browser.disconnect()`, not `browser.close()`.
- Read `saveTo` through a null-guard helper such as `readKey(...)`, because the canonical browser helper may return `null` for unresolved values.

## Browser Rule

Use Puppeteer only when real DOM access is required. For browser modules:

- require `wsEndpoint` from Afina;
- wait for full load after opening a URL;
- wait for the target element before interaction;
- apply a short random wait after interaction.

Default helpers and wait contracts live in `references/canonical/utils.js` and `references/best-practices.md`.

## Workflow

1. Decide whether the task is pure Node.js or browser-based.
2. Design `settings.json` with only the fields the module truly needs.
3. Implement business logic inside the template skeleton.
4. Add dependencies to `package.json` only if they are actually used.
5. Self-check settings/code consistency, IPC lifecycle, and output contract.

## Definition of Done

- `settings.json`, `index.js`, and `package.json` exist.
- All settings are read via `element.settings.<name>`.
- Inputs that support variables are resolved through `${...}` placeholders.
- `saveTo` is optional but, if present, writes exactly one final result.
- IPC messages and global handlers are present.
- Browser modules use `utils.js`, `getCurrentPage()`, and `browser.disconnect()`.

## References

- `references/templates.md` - minimal templates and field rules
- `references/best-practices.md` - guardrails and anti-patterns
- `references/canonical/utils.js` - canonical browser helper for Script Modules
- `references/examples/` - small working examples
