# afina-module-builder-skill

A skill for designing and building Afina 1.0.3 modules in the `settings.json` + `index.js` + `package.json` format.

## What the skill does

- defines a single standard for module structure and settings;
- helps correctly read parameters via `element.settings.<name>`;
- preserves IPC compatibility (`ready/success/error`) and safe process termination;
- always adds execution context for the agent: where it is in the module, which step it is performing, which inputs it reads, and where it writes the result;
- provides ready-to-use templates and working examples for Node.js and Puppeteer scenarios.

## What it is for

Use this skill when an Afina scenario needs a custom `executeModule` block with predictable behavior, stable error handling, and a fast development start.

## Development benefits

- less manual routine and fewer mistakes in the base scaffold;
- faster launch of new modules thanks to templates;
- a consistent module style across the team;
- fewer regressions due to built-in best practices.

## Best practices and examples

- the skill relies on the best practices section for stable and safe implementation;
- it includes module examples (minimal Node.js, browser Puppeteer, safe evolution of `settings.json`);
- examples can be used as a base and quickly adapted to your task.

Install the skill in a local project (without global installation).

Run this command in the root of your working project:

```bash
git clone https://github.com/YourNeighborZ/afina-module-builder-skill.git ".agents/skills/afina-module-builder-skill"
```

After that, the skill will be placed in the correct project folder and loaded automatically.
