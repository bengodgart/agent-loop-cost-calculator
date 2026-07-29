---
type: Playbook
title: Run agent-loop-cost-calculator locally
description: 'How to open agent-loop-cost-calculator and run its tests on a dev machine.'
generated:
  by: claude-opus-5
  at: '2026-07-29T04:31:42+00:00'
status: stable
---

# Steps

1. Clone the repo: `git clone https://github.com/bengodgart/agent-loop-cost-calculator.git`
2. Open `index.html` in a browser. There is nothing to install and no environment variables
   to set.
3. Change any input and every number updates instantly.

## Available scripts

* `node test.js` runs the test suite, 32 assertions.

There is no package manager step. The repo has no `package.json` and no dependencies.

## Common failures

* Editing a rate in `calc.js` and seeing no change on the page usually means a cached copy
  of the script. Hard reload the page.
* The default rates are July 2026 estimates, not a live price feed. A figure that disagrees
  with an Anthropic invoice means the rates in `calc.js` need updating, not that the math is
  wrong.

## Deploying

It is a static page, so GitHub Pages hosts it for $0. `publish-guide.html` in the repo has
the click path, and any static host works.
