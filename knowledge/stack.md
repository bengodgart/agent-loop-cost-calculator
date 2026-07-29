---
type: Tech Stack
title: agent-loop-cost-calculator stack
description: 'Frameworks, storage and services agent-loop-cost-calculator runs on.'
runtime: Browser
framework: 'None. Plain HTML, CSS and JavaScript.'
build: 'None. No build step and no dependencies.'
storage: 'None. Nothing is stored and there is no backend.'
hosting: GitHub Pages
tests: 'node test.js, 32 assertions'
generated:
  by: claude-opus-5
  at: '2026-07-29T04:31:42+00:00'
status: stable
---

# Stack

* **Runtime**: the browser. There is no server and no backend.
* **Framework**: none. Plain HTML, CSS and JavaScript.
* **Build**: none. No build step, no npm dependencies to fetch.
* **Files that carry the logic**: `index.html` for the page, `calc.js` for the pricing math
  as pure functions, `test.js` for the suite.
* **Storage**: none. Nothing is stored and nothing is sent anywhere.
* **Hosting**: GitHub Pages, which serves a static page like this for $0.
* **Tests**: `node test.js`, 32 assertions including a hand-computed 3-turn spot check.

## Notes

The pricing rates are editable constants in `calc.js`, each with a dated source link.
`calc.js` runs in both the browser and Node, so the code that renders the page is the code
the tests check.
