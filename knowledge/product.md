---
type: Product
title: agent-loop-cost-calculator
description: 'Model what a multi-turn agent loop really costs on the Claude API with prompt caching accounted for, next to what a plain token calculator would have told you. Runs entirely in the browser.'
domain: AI & LLM Tooling
users: 'Developers running Claude Code style agent loops who need to budget token cost before committing to a design.'
lifecycle: shipped
live_url: https://bengodgart.github.io/agent-loop-cost-calculator/
pricing: 'Free. MIT licensed, no signup.'
generated:
  by: claude-opus-5
  at: '2026-07-29T04:00:00+00:00'
status: stable
resource: https://github.com/bengodgart/agent-loop-cost-calculator.git
---

# agent-loop-cost-calculator

Model what a multi-turn agent loop really costs on the Claude API with prompt caching
accounted for, next to what a plain token calculator would have told you. Runs entirely in
the browser.

## Who it is for

Developers running Claude Code style agent loops who need to budget token cost before
committing to a design.

## What problem it solves

A generic token calculator prices an agent loop as a stack of identical independent API
calls. That is not how an agentic loop works: the same system prompt and tool definitions
are resent every turn, and prompt caching makes that repeated prefix much cheaper from turn
2 onward. On the default 20-turn loop with a 5,000-token prefix, a calculator with no
concept of caching prices it at $1.01 when the cache-aware cost is $0.76, 25 percent less.

The page shows the cache-aware total against the naive estimate, a per-turn breakdown of
when the cache is written and read, and a stated conclusion in words rather than two bare
numbers to compare.

## Current state

Shipped and public on GitHub Pages. Rates live in `calc.js` with dated source links. The
defaults are representative July 2026 figures and are labelled as estimates on the page,
because a precise figure depends on the model, the plan, and current Anthropic pricing.
