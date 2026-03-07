# Best Practices for Afina Script Modules

## Scope

These rules are for Script Modules only. Trigger modules are a different Afina product.

## Always Do

- Read settings only from `element.settings.<name>`.
- Keep the IPC wrapper and send `ready`, `success`, and `error` statuses.
- Add `uncaughtException`, `unhandledRejection`, and `disconnect` handlers.
- Use `${var}` placeholders only.
- Use `"loadTo": true` only on input fields that accept Afina variables.
- Keep `saveTo` free of `loadTo`.
- Return one final business result.

## Browser Modules

- Use browser automation only when the task truly needs DOM access.
- Copy `references/canonical/utils.js` as `utils.js`.
- Require `wsEndpoint`; Script browser modules connect to an already running Afina browser.
- Use `getCurrentPage()` instead of `browser.pages()[0]`.
- After opening a URL, wait for full page load.
- Before click/type/read actions, wait for the target element.
- After interaction, apply a short random wait.
- Release the session with `browser.disconnect()`, not `browser.close()`.

## `saveTo` Pattern

The canonical browser helper may return `null` for unresolved values, so output keys must be read through a guard helper:

```javascript
const readKey = (raw, savedObjects) => {
  if (!raw) return "";
  const resolved = replacePlaceholders(raw, savedObjects);
  return resolved !== null && resolved !== undefined ? String(resolved) : String(raw);
};
```

Recommended write block:

```javascript
if (saveTo && savedObjects && typeof savedObjects === "object") {
  savedObjects[saveTo] = result;
} else {
  logger.warn("saveTo is empty or savedObjects unavailable - result NOT saved.");
}
```

## Avoid

- Reading data from anywhere other than `element.settings`.
- Using `{{var}}` placeholders.
- Adding `loadTo` to `saveTo`.
- Using the browser for pure API/parsing work.
- Using `browser.pages()[0]`.
- Using `browser.close()` inside Script browser modules.
- Returning debug objects instead of the final result.
