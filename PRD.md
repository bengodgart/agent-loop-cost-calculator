# PRD — agent-loop-cost-calculator

**One-liner (from brief 12):** A single-page interactive calculator that models an agentic conversation: a fixed system prompt and tool definitions reused across N turns with prompt-cache reads, plus a growing history, and shows the true cached cost vs the naive per-call estimate every other calculator gives, for anyone budgeting a Claude Code or agent loop who has been misled by generic per-call token calculators.

**Usefulness (from brief 12):** Every existing token calculator ignores prompt caching math in realistic multi-turn agent loops. This models the one defensible slice: system prompt plus tool definitions reused across N turns with cache reads, the Claude Code use case. An agent loop's real cost is dominated by cache reads of a fixed prefix, which naive calculators mis-estimate badly.

## v1 scope (capped), traced to the brief

1. **Inputs** (brief: "system-prompt tokens, tool-definition tokens, per-turn new user tokens, per-turn model output tokens, number of turns, model, caching on/off") → `index.html` fields `systemTokens`, `toolTokens`, `userTokens`, `outputTokens`, `numTurns`, model segmented control, caching segmented control.
2. **Turn-by-turn model** (brief: "turn 1 pays cache-WRITE on the fixed prefix; turns 2..N pay cache-READ on the prefix + full price on the growing history + output") → `calc.js` `simulateLoop()`: turn 1 uses `CACHE_WRITE_MULTIPLIER` on the prefix, turns 2..N use `CACHE_READ_MULTIPLIER`, history accumulates every prior turn's user+output tokens at full input rate, output always at full output rate.
3. **Headline: true vs naive** (brief: "true cached cost vs naive estimate... as two numbers + a percent difference, with a per-turn breakdown table") → `calc.js` `compare()` runs the same loop with caching on and off; `index.html` shows both totals, the percent difference, and a per-turn breakdown table for the active scenario.
4. **UI conventions** (brief: "segmented control... ErrorAlert-style validation, results update live, a self-explanatory conclusion line... no bare numbers-to-compare without the conclusion stated. No em-dashes") → segmented controls for model and caching; a red `.alert` box lists every validation error; every input fires `render()` on `input`; `compare()` returns a stated `conclusion` sentence ("Caching saves X% over N turns on this loop" or the write-premium explanation for N=1); no em-dashes anywhere in `index.html`, `README.md`, or `posts/`.
5. **Worked default example, no dead empty state** (brief: "Opens with a worked default example already filled in... and a one-line explanation of why naive calculators are wrong for agent loops") → defaults are prefilled (5,000-token prefix split as 1,500 system + 3,500 tools, 300 new user tokens, 600 output tokens, 20 turns, Sonnet, caching on) and `render()` runs on page load, so the page shows a real true-vs-naive comparison and conclusion immediately. The tagline states the caching-blindness problem in one line.

## Non-goals (do not build, per the brief)

- A backend, accounts, or saved scenarios to a server.
- Multi-provider generic pricing: this models the Claude prompt-caching pattern specifically, not a ninth generic calculator.
- Live API calls to price-check.
- A "pro" tier or an editable-rate form (pricing constants are edited in `calc.js` with dated source links per the brief; no live rate-override UI was added, keeping scope capped to what the brief's v1 list actually asks for).

## Demo path (stranger sees value in under 2 minutes)

Open `index.html` → the default 20-turn Sonnet scenario shows a true cached cost, a naive per-call estimate, and a one-sentence stated conclusion instantly. Toggle "Prompt caching" to Off and watch the per-turn table and headline update live. Switch models. Change turn count to 1 and see the conclusion flip to explain the cache-write premium.

## Done when (from brief 12)

- The page loads with a worked example already showing a true-vs-naive cost and percent difference (no empty state). **Met.** Verified in EVIDENCE.md.
- The cached total matches a hand-computed spot check for a small N (paste the check), and turning caching off changes the number correctly. **Met.** `test.js` reproduces the N=3 hand computation and asserts caching-off costs more; see EVIDENCE.md.
- UI follows portfolio conventions (segmented control, stated-conclusion line, validation); copy passes the no-em-dash sweep. **Met.** Verified in EVIDENCE.md.
- Deployable as a single static file to a free host with a live URL; runs at $0, client-side only. **Met.** `index.html` + `calc.js` only, no network calls, no backend.
