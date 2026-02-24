# AI Agents Guide for Afina Module Builder Skill

Welcome to the `afina-module-builder-skill` repository. This file provides guidelines, conventions, and operational procedures for AI agents (like Cursor, Copilot, or Claude) working within this codebase.

## 1. Project Overview
This repository contains a specialized AI agent skill designed for building Afina 1.0.3 modules. The core artifacts are stored under `.agents/skills/afina-module-builder-skill/`.
The modules produced by this skill typically consist of `settings.json`, `index.js`, and `package.json`.

## 2. Build, Lint, and Test Commands
Since this repository primarily hosts Markdown documentation and skill definitions rather than a compiled application, standard build steps are minimal. However, when working on or testing the generated *Afina modules*, use the following standard Node.js commands:

### For the Skill Repository Itself:
- **Linting (Markdown/JSON):** Ensure valid formatting for all Markdown and JSON files.
  - `npx prettier --write "**/*.{md,json}"` (if Prettier is installed globally/locally)
- **Validation:** Ensure the `SKILL.md` or any instruction set files are readable and well-structured.

### For Generated Afina Modules:
When generating or modifying an Afina module structure (`index.js`, `settings.json`, `package.json`):
- **Install dependencies:** `npm install`
- **Run module locally (mocking Afina environment):** `node index.js`
- **Testing:** If the module has unit tests (e.g., Jest or Mocha):
  - **Run all tests:** `npm test`
  - **Run a single test file:** `npx jest path/to/test.js` or `npm test -- path/to/test.js`

## 3. Code Style & Guidelines
When contributing to this repository or generating Afina modules, adhere to the following conventions:

### General Architecture
- **Afina Module Structure:** Every module must have:
  - `index.js` (entry point)
  - `settings.json` (UI configuration for Afina)
  - `package.json` (dependencies)
- **Modularity:** Keep the skill instructions modular. If the skill grows, split templates into separate files rather than maintaining one massive Markdown file.

### Formatting & Syntax (JavaScript/Node.js)
- **Language:** JavaScript (Node.js environment).
- **Indentation:** 2 spaces.
- **Quotes:** Single quotes `''` preferred for strings in JS, double quotes `""` for JSON.
- **Semicolons:** Required.
- **Variable Declarations:** Use `const` by default. Use `let` only when reassignment is necessary. Never use `var`.

### Imports
- Use CommonJS (`require()`) as it is the standard for legacy Node.js execution blocks in Afina, unless the module explicitly configures `"type": "module"` in `package.json`.
- Group imports: Built-in Node modules first, third-party packages second, local files last.

### Naming Conventions
- **Files & Directories:** `kebab-case` (e.g., `afina-module-builder-skill`).
- **Variables & Functions:** `camelCase` (e.g., `executeModule`, `handleError`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`).
- **Classes/Constructors:** `PascalCase`.

### Error Handling & IPC Communication
- **Process Messaging:** Afina modules communicate via `process.send()`.
- **Success State:** Always signal completion cleanly:
  ```javascript
  process.send({ type: 'success', data: result });
  process.exit(0);
  ```
- **Error State:** Catch all exceptions and signal errors back to Afina to prevent zombie processes:
  ```javascript
  try {
    // ...
  } catch (err) {
    process.send({ type: 'error', data: err.message });
    process.exit(1);
  }
  ```

### Typing
- If TypeScript is introduced for module generation, strictly type all module inputs/outputs.
- Document expected types in `settings.json` parameters.

### Comments & Documentation
- Document *why* something is done, not just *what*.
- Ensure `README.md` and `README_RU.md` remain synchronized when introducing new skill features.
- Provide examples of `settings.json` configurations in the documentation.

## 4. Agent Operational Directives
- **Verification:** Before assuming a skill file structure, use `ls -la .agents/skills/afina-module-builder-skill/` to verify its contents.
- **No Unprompted Changes:** Do not alter the core IPC logic (`process.send`) of the generated templates unless explicitly instructed, as it breaks Afina compatibility.
- **Language Awareness:** The repo contains both English (`README.md`) and Russian (`README_RU.md`) files. When updating docs, prompt the user if you should update both.
- **Absolute Paths:** When using file system tools, always compute the absolute path from the repository root (without hardcoding a machine-specific local path).

## 5. Security
- Never hardcode API keys or credentials in generated modules.
- Always use `${...}` Afina placeholders for sensitive settings defined in `settings.json`.
- Avoid executing untrusted code or arbitrary shell commands within the module templates unless strictly required by the user's scenario.
