# afina-module-builder-skill

A skill for designing and building Afina 1.0.3 modules in the `settings.json` + `index.js` + `package.json` format.

## What the skill does

- defines a single standard for module structure and settings;
- helps correctly read parameters via `element.settings.<name>`;
- preserves IPC compatibility (`ready/success/error`) and safe process termination;
- enforces strict `${...}` placeholders and a business-value output contract;
- provides ready-to-use templates and working examples for Node.js and Puppeteer scenarios.

## What it is for

Use this skill when an Afina scenario needs a custom `executeModule` block with predictable behavior, stable error handling, and a fast development start.

## Development benefits

- less manual routine and fewer mistakes in the base scaffold;
- faster launch of new modules thanks to templates;
- a consistent module style across the team;
- fewer regressions due to built-in best practices.

## Install into a project

This repository stores the skill under `.agents/skills/afina-module-builder-skill/`. To avoid double nesting, install it in two steps:

```bash
git clone https://github.com/YourNeighborZ/afina-module-builder-skill.git ".agents/skills/afina-module-builder-skill-repo"
```

After that, the skill is in the correct project folder and can be loaded automatically.
