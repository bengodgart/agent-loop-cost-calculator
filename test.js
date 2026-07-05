// Unit tests for the agent-loop cost model. Run: node test.js
// No dependencies. Exits non-zero on any failure.

const CostCalc = require("./calc.js");

let passed = 0;
let failed = 0;

function assert(name, cond) {
  if (cond) {
    passed++;
    console.log("  ok   " + name);
  } else {
    failed++;
    console.log("  FAIL " + name);
  }
}

function approx(a, b, tol) {
  return Math.abs(a - b) <= (tol == null ? 0.0001 : tol);
}

// The page's default worked example: a 5,000-token fixed prefix (system
// prompt + tool definitions), 300 new user tokens and 600 output tokens per
// turn, over 20 turns, on Claude Sonnet ($3/$15 per 1M tokens).
const DEFAULT_EXAMPLE = {
  systemPromptTokens: 1500,
  toolDefTokens: 3500,
  perTurnUserTokens: 300,
  perTurnOutputTokens: 600,
  numTurns: 20,
  model: "claude-sonnet",
};

// --- Hand-computed spot check, N = 3, caching ON ---------------------------
// prefix = 5000 tokens, sonnet in = $3.00/1M, out = $15.00/1M
// turn 1: prefix cache-WRITE  5000 * 3.00 * 1.25 / 1e6 = 0.01875
//         new user            300  * 3.00        / 1e6 = 0.0009
//         output               600 * 15.00        / 1e6 = 0.009
//         turn1 = 0.02865
// turn 2: prefix cache-READ   5000 * 3.00 * 0.1  / 1e6 = 0.0015
//         history (900 tok)   900  * 3.00        / 1e6 = 0.0027
//         new user + output                             = 0.0099
//         turn2 = 0.0141
// turn 3: prefix cache-READ                              = 0.0015
//         history (1800 tok)  1800 * 3.00        / 1e6 = 0.0054
//         new user + output                             = 0.0099
//         turn3 = 0.0168
// total(N=3, caching on) = 0.02865 + 0.0141 + 0.0168 = 0.05955
const n3 = CostCalc.simulateLoop(Object.assign({}, DEFAULT_EXAMPLE, { numTurns: 3, cachingEnabled: true }));
assert("N=3 caching-on turn 1 cost = 0.02865 (hand-computed)", approx(n3.turns[0].turnCost, 0.02865, 0.000001));
assert("N=3 caching-on turn 2 cost = 0.0141 (hand-computed)", approx(n3.turns[1].turnCost, 0.0141, 0.000001));
assert("N=3 caching-on turn 3 cost = 0.0168 (hand-computed)", approx(n3.turns[2].turnCost, 0.0168, 0.000001));
assert("N=3 caching-on total = 0.05955 (hand-computed)", approx(n3.total, 0.05955, 0.000001));

// --- Hand-computed spot check, N = 3, caching OFF (the naive number) -------
// turn t: prefix full price 5000*3.00/1e6=0.015 + newUser 0.0009 + output 0.009
//         + history(t-1)*900*3.00/1e6 = 0.0249 + (t-1)*0.0027
// t=1: 0.0249   t=2: 0.0276   t=3: 0.0303   total = 0.0828
const n3off = CostCalc.simulateLoop(Object.assign({}, DEFAULT_EXAMPLE, { numTurns: 3, cachingEnabled: false }));
assert("N=3 caching-off turn 1 cost = 0.0249 (hand-computed)", approx(n3off.turns[0].turnCost, 0.0249, 0.000001));
assert("N=3 caching-off turn 3 cost = 0.0303 (hand-computed)", approx(n3off.turns[2].turnCost, 0.0303, 0.000001));
assert("N=3 caching-off total = 0.0828 (hand-computed)", approx(n3off.total, 0.0828, 0.000001));

// --- Turning caching off changes the number, in the correct direction -----
assert("caching off costs MORE than caching on for the same N=3 loop", n3off.total > n3.total);
assert("N=3 caching-on vs caching-off differ by more than a rounding error", Math.abs(n3off.total - n3.total) > 0.02);

// --- Cache-action bookkeeping: turn 1 writes, turns 2..N read -------------
const n5 = CostCalc.simulateLoop(Object.assign({}, DEFAULT_EXAMPLE, { numTurns: 5, cachingEnabled: true }));
assert("turn 1 uses cache-WRITE, not read", n5.turns[0].cacheAction === "write");
assert("turns 2..N all use cache-READ, never write", n5.turns.slice(1).every((t) => t.cacheAction === "read"));

const n5off = CostCalc.simulateLoop(Object.assign({}, DEFAULT_EXAMPLE, { numTurns: 5, cachingEnabled: false }));
assert("with caching off, no turn writes or reads the cache", n5off.turns.every((t) => t.cacheAction === "none"));

// --- History accumulates the full growing transcript, not just the prefix -
assert("turn 1 has zero history (nothing came before it)", n5.turns[0].historyTokens === 0);
assert("turn 3 history = 2 prior turns * (300+600) = 1800 tokens", n5.turns[2].historyTokens === 1800);
assert("turn 5 history = 4 prior turns * (300+600) = 3600 tokens", n5.turns[4].historyTokens === 3600);

// --- The default 20-turn example: true cached cost vs naive estimate ------
// Formulas (see calc.js): with caching, turn1 = 0.02865, turns2..20 sum to
// 19*0.0114 + 0.0027*sum(1..19) = 0.2166 + 0.513 = 0.7296 -> total 0.75825
// Without caching: 20*0.0249 + 0.0027*sum(0..19) = 0.498 + 0.513 = 1.011
const cmp = CostCalc.compare(DEFAULT_EXAMPLE);
assert("compare() returns no errors for the default example", cmp.errors.length === 0);
assert("default example: true cached cost (20 turns) = $0.75825 (hand-computed)", approx(cmp.withCaching.total, 0.75825, 0.0001));
assert("default example: naive/no-caching estimate (20 turns) = $1.011 (hand-computed)", approx(cmp.withoutCaching.total, 1.011, 0.0001));
assert("default example: caching saves ~25% over 20 turns", approx(cmp.pct, 24.98, 0.5));
assert("default example: savesMoney is true", cmp.savesMoney === true);
assert("default example: conclusion states a percent savings", /saves \d+% over 20 turns/.test(cmp.conclusion));

// --- Single-turn edge case: the cache-write premium costs more, not less ---
// N=1: with caching pays a 1.25x premium on the whole prefix with no read
// turns to amortize it against, so it costs MORE than skipping caching.
const cmp1 = CostCalc.compare(Object.assign({}, DEFAULT_EXAMPLE, { numTurns: 1 }));
assert("N=1: caching costs more than not caching (no reads to amortize the write premium)", cmp1.withCaching.total > cmp1.withoutCaching.total);
assert("N=1: savesMoney is false", cmp1.savesMoney === false);
assert("N=1: conclusion explains the write-premium overhead, not savings", /pays off/.test(cmp1.conclusion));

// --- Break-even happens by turn 2 -------------------------------------------
const cmp2 = CostCalc.compare(Object.assign({}, DEFAULT_EXAMPLE, { numTurns: 2 }));
assert("N=2: caching already saves money", cmp2.withCaching.total < cmp2.withoutCaching.total);

// --- Validation -------------------------------------------------------------
const bad1 = CostCalc.simulateLoop({ systemPromptTokens: -1, toolDefTokens: 0, perTurnUserTokens: 0, perTurnOutputTokens: 0, numTurns: 1, model: "claude-sonnet" });
assert("negative system-prompt tokens is an error", bad1.errors && bad1.errors.length > 0);

const bad2 = CostCalc.simulateLoop({ systemPromptTokens: 100, toolDefTokens: 0, perTurnUserTokens: 0, perTurnOutputTokens: 0, numTurns: 0, model: "claude-sonnet" });
assert("zero turns is an error", bad2.errors && bad2.errors.length > 0);

const bad3 = CostCalc.simulateLoop({ systemPromptTokens: 100, toolDefTokens: 0, perTurnUserTokens: 0, perTurnOutputTokens: 0, numTurns: 5, model: "not-a-model" });
assert("unknown model is an error", bad3.errors && bad3.errors.length > 0);

const bad4 = CostCalc.simulateLoop({ systemPromptTokens: 0, toolDefTokens: 0, perTurnUserTokens: 0, perTurnOutputTokens: 0, numTurns: 5, model: "claude-sonnet" });
assert("all-zero token counts is an error", bad4.errors && bad4.errors.length > 0);

const ok = CostCalc.simulateLoop(DEFAULT_EXAMPLE);
assert("the default example itself passes validation", ok.errors.length === 0);

// --- Model coverage ----------------------------------------------------------
assert("MODEL_DEFAULTS covers opus, sonnet, and haiku", CostCalc.MODEL_DEFAULTS["claude-opus"] && CostCalc.MODEL_DEFAULTS["claude-sonnet"] && CostCalc.MODEL_DEFAULTS["claude-haiku"]);
const opusRun = CostCalc.simulateLoop(Object.assign({}, DEFAULT_EXAMPLE, { model: "claude-opus" }));
assert("switching to a pricier model (Opus) raises the total", opusRun.total > ok.total);

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
