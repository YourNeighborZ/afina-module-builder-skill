# 01 minimal-node

Minimal Afina module without browser. Suitable for string and number transformations.

## What this example shows

- `settings.json` in the style of working Afina 1.0.3 modules (`type` as module name).
- Using `loadTo` for the input field.
- Canonical reading via `element.settings.<name>`.
- Writing result to `savedObjects[element.settings.saveTo]`.
- Saving the result in `savedObjects` and returning via IPC.
