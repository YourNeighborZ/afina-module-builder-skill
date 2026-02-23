# 03 settings-fix-from-nousresearch

This example shows how to carefully improve a real `settings.json` without breaking changes.

## What was fixed

- `type` is preserved as in the working module (`Nousresearch`).
- Field names are preserved (`maxTokens`, `saveTo`, `delay2`) for full compatibility.
- Shows a safe version of improvements that doesn't require rewriting `index.js`.
- Added more understandable `label`, `groupId`, and `default` for `model`.
- `settings.after.json` uses canonical `"loadTo": true`; `settings.before.json` keeps legacy `"true"` for contrast.

Files:

- `settings.before.json` - original view.
- `settings.after.json` - recommended compatible view.
