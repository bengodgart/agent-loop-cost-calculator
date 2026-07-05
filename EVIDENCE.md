# EVIDENCE — agent-loop-cost-calculator

Ship-gate evidence for the brief at `P:/ai-job-search/portfolio/briefs/12-agent-loop-cost-calculator.md`. Everything below is pasted terminal output, not a summary.

## 1. `node test.js` — full output, exit code

```
$ node test.js
  ok   N=3 caching-on turn 1 cost = 0.02865 (hand-computed)
  ok   N=3 caching-on turn 2 cost = 0.0141 (hand-computed)
  ok   N=3 caching-on turn 3 cost = 0.0168 (hand-computed)
  ok   N=3 caching-on total = 0.05955 (hand-computed)
  ok   N=3 caching-off turn 1 cost = 0.0249 (hand-computed)
  ok   N=3 caching-off turn 3 cost = 0.0303 (hand-computed)
  ok   N=3 caching-off total = 0.0828 (hand-computed)
  ok   caching off costs MORE than caching on for the same N=3 loop
  ok   N=3 caching-on vs caching-off differ by more than a rounding error
  ok   turn 1 uses cache-WRITE, not read
  ok   turns 2..N all use cache-READ, never write
  ok   with caching off, no turn writes or reads the cache
  ok   turn 1 has zero history (nothing came before it)
  ok   turn 3 history = 2 prior turns * (300+600) = 1800 tokens
  ok   turn 5 history = 4 prior turns * (300+600) = 3600 tokens
  ok   compare() returns no errors for the default example
  ok   default example: true cached cost (20 turns) = $0.75825 (hand-computed)
  ok   default example: naive/no-caching estimate (20 turns) = $1.011 (hand-computed)
  ok   default example: caching saves ~25% over 20 turns
  ok   default example: savesMoney is true
  ok   default example: conclusion states a percent savings
  ok   N=1: caching costs more than not caching (no reads to amortize the write premium)
  ok   N=1: savesMoney is false
  ok   N=1: conclusion explains the write-premium overhead, not savings
  ok   N=2: caching already saves money
  ok   negative system-prompt tokens is an error
  ok   zero turns is an error
  ok   unknown model is an error
  ok   all-zero token counts is an error
  ok   the default example itself passes validation
  ok   MODEL_DEFAULTS covers opus, sonnet, and haiku
  ok   switching to a pricier model (Opus) raises the total

32 passed, 0 failed
EXIT CODE: 0
```

Includes the two required behavior checks: "caching off costs MORE than caching on" (turning caching off changes the number, and changes it in the correct direction), and "turns 2..N all use cache-READ, never write" plus "turn 1 uses cache-WRITE, not read" (turn 1 writes, every later turn reads).

## 2. Hand-computed spot check, N = 3, against `calc.js`

Inputs: system-prompt tokens 1,500 + tool-def tokens 3,500 = **5,000-token prefix**; per-turn new user tokens 300; per-turn output tokens 600; model Claude Sonnet ($3.00 / 1M input, $15.00 / 1M output); cache write multiplier 1.25x, cache read multiplier 0.1x (both applied to the base input rate).

**Caching ON:**

```
Turn 1 (cache WRITE on the prefix, no history yet):
  prefix:  5000 tok * 3.00 * 1.25 / 1,000,000 = 0.01875
  history: 0 tok                              = 0
  new user: 300 tok * 3.00 / 1,000,000        = 0.0009
  output:   600 tok * 15.00 / 1,000,000       = 0.009
  turn 1 total = 0.01875 + 0 + 0.0009 + 0.009 = 0.02865

Turn 2 (cache READ on the prefix, history = turn 1's 300+600 = 900 tok):
  prefix:  5000 tok * 3.00 * 0.1 / 1,000,000  = 0.0015
  history: 900 tok * 3.00 / 1,000,000         = 0.0027
  new user + output                           = 0.0009 + 0.009 = 0.0099
  turn 2 total = 0.0015 + 0.0027 + 0.0099      = 0.0141

Turn 3 (cache READ, history = 2 prior turns * 900 = 1,800 tok):
  prefix:  0.0015
  history: 1800 tok * 3.00 / 1,000,000        = 0.0054
  new user + output                           = 0.0099
  turn 3 total = 0.0015 + 0.0054 + 0.0099      = 0.0168

TOTAL (N=3, caching ON) = 0.02865 + 0.0141 + 0.0168 = 0.05955
```

`test.js` asserts each of these four numbers (`turn1.turnCost`, `turn2.turnCost`, `turn3.turnCost`, `total`) against `calc.js`'s output with a 1e-6 tolerance. All four passed above ("N=3 caching-on turn 1/2/3 cost" and "N=3 caching-on total").

**Caching OFF (the naive/no-caching number), same N = 3 inputs:**

```
Every turn prices the prefix at the FULL base rate (no write/read discount):
  turn(t) = (5000*3.00 + 300*3.00)/1e6 + 600*15.00/1e6 + (t-1)*900*3.00/1e6
          = 0.0249 + (t-1) * 0.0027

  turn 1 = 0.0249
  turn 2 = 0.0276
  turn 3 = 0.0303

TOTAL (N=3, caching OFF) = 0.0249 + 0.0276 + 0.0303 = 0.0828
```

`calc.js` returns **0.0828** for this exact case (verified above: "N=3 caching-off turn 1/3 cost" and "N=3 caching-off total" all match to 1e-6). `0.0828 > 0.05955`, confirming caching off costs more, i.e. turning caching off changes the number, and changes it in the correct (more expensive) direction, for the same loop.

## 3. Default worked example on page load

`index.html` ships with these input values already filled in (no empty state): System-prompt tokens 1500, Tool-definition tokens 3500, Number of turns 20, Per-turn new user tokens 300, Per-turn model output tokens 600, model Claude Sonnet, Prompt caching On. `render()` runs once on load with no user interaction required.

Ran the exact same computation `index.html`'s `render()` performs (via `calc.js` directly, same inputs, same `fmt()` formatter used in the page):

```
$ node -e "... (see calc.js compare() call with the page defaults) ..."
errors: []
True cached cost: $0.7582
Naive estimate: $1.01
pct: 25.00
conclusion: Caching saves 25% over 20 turns on this loop.
turn1 cacheAction (caching on): write
turn2 cacheAction (caching on): read
turn20 cacheAction (caching on): read
```

So on load, a stranger sees, with zero input: **"True cached cost (with prompt caching): $0.7582"** next to **"Naive per-call estimate (no caching): $1.01"**, a green/orange proportional bar, and the stated conclusion **"Caching saves 25% over 20 turns on this loop."** The per-turn breakdown table beneath (toggle defaults to caching ON) shows turn 1 tagged "cache write" and turns 2 through 20 tagged "cache read." No empty state, no dead placeholder, a real illustrative gap (25%) on load.

## 4. No-em-dash sweep

```
$ grep -rn "—\|&mdash;" index.html README.md posts/ PRD.md publish-guide.html parking_lot.md
PRD.md:1:# PRD — agent-loop-cost-calculator
```

Only match is the PRD.md title, which is the explicitly accepted house exception ("a single em-dash in the PRD.md TITLE only is the accepted house convention"). `index.html`, `README.md`, `posts/*.md`, `posts/posts-preview.html`, `publish-guide.html`, and `parking_lot.md` are all clean. (`calc.js` and `test.js` were not included in the sweep since they are code comments, not UI copy, README, or posts, but were spot-checked and are also clean.)

## Result

- `node test.js`: **32 passed, 0 failed, exit code 0.**
- Hand check for N=3 matches `calc.js` to 6 decimal places for every turn and the total, for both caching on and caching off.
- Page loads with a real, non-empty worked example: $0.7582 true cached cost vs $1.01 naive estimate, 25% savings stated as a conclusion sentence, not bare numbers.
- No-em-dash sweep clean except the one house-approved PRD.md title instance.

Nothing here was papered over; every number above is reproducible by running `node test.js` or the one-line `node -e` command in section 3 from `C:/dev/agent-loop-cost-calculator`.
