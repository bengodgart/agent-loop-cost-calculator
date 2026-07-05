// Pure cost model for an agentic (multi-turn, tool-using) Claude conversation.
// Works in the browser (attaches to window.CostCalc) and in Node
// (module.exports), so the same function powers the page and the tests.
//
// The problem this solves: a generic "tokens per call x number of calls"
// calculator has no idea that an agent loop resends a large fixed prefix
// (system prompt + tool definitions) on every single turn, and that prefix
// qualifies for Anthropic prompt caching at a steep discount after the first
// turn. This file models the loop turn by turn so that discount, and the
// growing conversation history that always gets resent in full, both show up
// in the total.
//
// Model of one loop, given fixed per-turn shapes (same new-user-tokens and
// same new-output-tokens on every turn -- a reasonable single-scenario
// simplification, not a claim that real loops are perfectly uniform):
//
//   prefixTokens = systemPromptTokens + toolDefTokens        (constant, resent every turn)
//   historyTokens(turn t) = sum of (userTokens + outputTokens) for turns 1..t-1
//                                                             (the growing transcript, resent every turn)
//
//   Turn 1:
//     prefix         -> cache WRITE rate (if caching on) or base rate (if off)
//     new user turn  -> base input rate (nothing to cache yet)
//     output         -> base output rate (output is never cached)
//   Turns 2..N:
//     prefix         -> cache READ rate (if caching on) or base rate (if off)
//     history so far -> base input rate (this simplified model never caches
//                       the growing history itself, only the fixed prefix --
//                       see parking_lot.md for the rolling-cache expansion)
//     new user turn  -> base input rate
//     output         -> base output rate
//
//   total = sum of every turn's cost
//
// "Caching on" vs "caching off" is the exact toggle a naive per-call
// calculator is blind to: a tool that doesn't know about prompt caching would
// price every turn's prefix at the full base rate, every time. That is
// precisely what cachingEnabled: false computes here -- same accurate
// growing-history accounting, minus the cache discount. That is the honest
// "naive per-call estimate" comparison used on the page: the growing
// transcript is unavoidable and any correct calculator must count it, but a
// generic one misses that the repeated prefix portion of it is cache-eligible.
//
// Pricing constants below are per-1,000,000-token USD rates and are dated,
// editable ESTIMATES -- see the sources note below and on the page. Checked
// against platform.claude.com/docs pricing + prompt-caching pages, July 2026.

(function (root) {
  // Per-1M-token USD rates. Source: platform.claude.com/docs/en/pricing.md,
  // checked 2026-07. Claude Sonnet has a discounted intro rate ($2/$10 per
  // MTok) through 2026-08-31; the standard $3/$15 rate is used below so the
  // defaults still hold after that date. Edit these to match your own plan.
  var MODEL_DEFAULTS = {
    "claude-opus": { label: "Claude Opus", in: 5.0, out: 25.0 },
    "claude-sonnet": { label: "Claude Sonnet", in: 3.0, out: 15.0 },
    "claude-haiku": { label: "Claude Haiku", in: 1.0, out: 5.0 },
  };

  // Prompt caching multipliers, applied to the model's base INPUT rate.
  // Source: platform.claude.com/docs/en/build-with-claude/prompt-caching.md,
  // checked 2026-07.
  //   cache WRITE (5-minute TTL): ~1.25x base input rate
  //   cache READ:                 ~0.1x base input rate
  var CACHE_WRITE_MULTIPLIER = 1.25;
  var CACHE_READ_MULTIPLIER = 0.1;

  function num(v) {
    var n = typeof v === "number" ? v : parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  // Cost of `tokens` tokens at `dollarsPerMillion` USD per 1,000,000 tokens.
  function tokenCost(tokens, dollarsPerMillion) {
    return (tokens * dollarsPerMillion) / 1000000;
  }

  // inputs: {systemPromptTokens, toolDefTokens, perTurnUserTokens,
  //          perTurnOutputTokens, numTurns, model, cachingEnabled}
  // Returns {errors:[...]} on invalid input, or the full turn-by-turn result.
  function simulateLoop(inputs) {
    var errors = [];

    var systemPromptTokens = num(inputs.systemPromptTokens);
    var toolDefTokens = num(inputs.toolDefTokens);
    var perTurnUserTokens = num(inputs.perTurnUserTokens);
    var perTurnOutputTokens = num(inputs.perTurnOutputTokens);
    var numTurns = Math.round(num(inputs.numTurns));
    var model = inputs.model;
    var cachingEnabled = !!inputs.cachingEnabled;

    if (!MODEL_DEFAULTS[model]) errors.push("Pick a model.");
    if (systemPromptTokens < 0) errors.push("System-prompt tokens cannot be negative.");
    if (toolDefTokens < 0) errors.push("Tool-definition tokens cannot be negative.");
    if (perTurnUserTokens < 0) errors.push("Per-turn user tokens cannot be negative.");
    if (perTurnOutputTokens < 0) errors.push("Per-turn output tokens cannot be negative.");
    if (!isFinite(numTurns) || numTurns < 1) errors.push("Number of turns must be at least 1.");
    if (numTurns > 500) errors.push("Number of turns must be 500 or fewer.");
    if (systemPromptTokens === 0 && toolDefTokens === 0 && perTurnUserTokens === 0 && perTurnOutputTokens === 0) {
      errors.push("Enter at least one non-zero token count.");
    }

    if (errors.length) return { errors: errors };

    var rates = MODEL_DEFAULTS[model];
    var inRate = rates.in;
    var outRate = rates.out;
    var prefixTokens = systemPromptTokens + toolDefTokens;

    var turns = [];
    var cumHistory = 0;
    var total = 0;

    for (var t = 1; t <= numTurns; t++) {
      var isFirstTurn = t === 1;
      var cacheAction = !cachingEnabled ? "none" : isFirstTurn ? "write" : "read";

      var prefixRate;
      if (!cachingEnabled) prefixRate = inRate;
      else if (isFirstTurn) prefixRate = inRate * CACHE_WRITE_MULTIPLIER;
      else prefixRate = inRate * CACHE_READ_MULTIPLIER;

      var prefixCost = tokenCost(prefixTokens, prefixRate);
      var historyCost = tokenCost(cumHistory, inRate);
      var newUserCost = tokenCost(perTurnUserTokens, inRate);
      var outputCost = tokenCost(perTurnOutputTokens, outRate);
      var turnCost = prefixCost + historyCost + newUserCost + outputCost;

      total += turnCost;

      turns.push({
        turn: t,
        cacheAction: cacheAction,
        prefixTokens: prefixTokens,
        prefixCost: prefixCost,
        historyTokens: cumHistory,
        historyCost: historyCost,
        newUserTokens: perTurnUserTokens,
        newUserCost: newUserCost,
        outputTokens: perTurnOutputTokens,
        outputCost: outputCost,
        turnCost: turnCost,
        cumulativeCost: total,
      });

      cumHistory += perTurnUserTokens + perTurnOutputTokens;
    }

    return {
      errors: [],
      model: model,
      modelLabel: rates.label,
      cachingEnabled: cachingEnabled,
      prefixTokens: prefixTokens,
      numTurns: numTurns,
      turns: turns,
      total: total,
    };
  }

  // Runs the same inputs twice -- once with caching on, once off -- and
  // returns both plus the comparison the headline needs. This is the
  // true-cached-cost-vs-naive-estimate pair: "withCaching" is what Claude's
  // real prompt-caching mechanics produce; "withoutCaching" is what a
  // generic per-call calculator (blind to the cache-eligible prefix) would
  // say for the same loop.
  function compare(inputs) {
    var withCaching = simulateLoop(Object.assign({}, inputs, { cachingEnabled: true }));
    if (withCaching.errors && withCaching.errors.length) return { errors: withCaching.errors };

    var withoutCaching = simulateLoop(Object.assign({}, inputs, { cachingEnabled: false }));
    if (withoutCaching.errors && withoutCaching.errors.length) return { errors: withoutCaching.errors };

    var diff = withoutCaching.total - withCaching.total;
    var pct = withoutCaching.total > 0 ? (diff / withoutCaching.total) * 100 : 0;
    var savesMoney = diff > 0;

    var conclusion;
    if (savesMoney) {
      conclusion =
        "Caching saves " + pct.toFixed(0) + "% over " + withCaching.numTurns +
        (withCaching.numTurns === 1 ? " turn" : " turns") + " on this loop.";
    } else {
      conclusion =
        "With only " + withCaching.numTurns + (withCaching.numTurns === 1 ? " turn, " : " turns, ") +
        "the cache-write premium makes caching cost " + Math.abs(pct).toFixed(0) +
        "% more than skipping it. Caching pays off once the loop runs more turns.";
    }

    return {
      errors: [],
      withCaching: withCaching,
      withoutCaching: withoutCaching,
      diff: diff,
      pct: pct,
      savesMoney: savesMoney,
      conclusion: conclusion,
    };
  }

  var api = {
    simulateLoop: simulateLoop,
    compare: compare,
    MODEL_DEFAULTS: MODEL_DEFAULTS,
    CACHE_WRITE_MULTIPLIER: CACHE_WRITE_MULTIPLIER,
    CACHE_READ_MULTIPLIER: CACHE_READ_MULTIPLIER,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.CostCalc = api;
  }
})(typeof window !== "undefined" ? window : this);
