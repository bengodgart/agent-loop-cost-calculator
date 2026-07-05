# agent-loop-cost-calculator

**Your token calculator is lying about what your agent loop actually costs.** Model a 20-turn Claude Code style conversation with a 5,000-token system prompt and tool set: a calculator that does not know about prompt caching prices it at $1.01. The real, cache-aware cost is $0.76, 25% less, because the fixed prefix gets reused at a steep discount from turn 2 onward.

It is a single page. No signup, no backend, nothing stored, all math in your browser.

## Try it

Open `index.html` in a browser, or use the live version once it is deployed (see below). Change any input and every number updates instantly.

## What it shows

- **True cached cost vs a naive per-call estimate.** The naive number is what any generic calculator gives you: it still has to account for the growing conversation history (there is no way around resending it), but it has no idea the repeated system prompt and tool definitions are eligible for an automatic cache discount, so it prices that portion at full rate every single turn.
- **A per-turn breakdown table** showing exactly when the cache gets written (turn 1) and read (every turn after), how the conversation history grows, and what each turn costs.
- **A stated conclusion**, not two bare numbers to compare: "Caching saves 25% over 20 turns on this loop," or for a single-turn loop, an explanation that the cache-write premium costs more than skipping caching until a second turn comes along to read it back.

## How the cost is modeled

- A fixed prefix (system prompt plus tool definitions) is resent on every turn of an agent loop, along with the growing transcript of everything said so far, plus that turn's new content.
- With prompt caching on: turn 1 pays a cache-write premium on the prefix (about 1.25x the base input rate for a 5-minute cache). Every turn after that pays a cache-read rate on the same prefix (about 0.1x base input) instead of the full rate.
- The growing history and the model's output are never cached in this model. They are billed at the base input and output rates every turn, because that is genuinely new content.
- With caching off, the prefix is billed at the full input rate on every turn. This is the same accurate turn-by-turn accounting, just without the discount, which is exactly what a token calculator with no concept of Claude's prompt caching would produce.

Rates are editable in `calc.js`, with dated source links. Defaults are representative July 2026 figures and are clearly labeled estimates. A precise figure depends on your model, plan, and Anthropic's current pricing page.

## The numbers are tested

The pricing math lives in `calc.js` as pure functions, with a dependency-free test suite:

```bash
node test.js   # 32 assertions, including a hand-computed 3-turn spot check
```

The tests reproduce a hand-worked 3-turn example by hand, confirm caching off changes the total in the correct direction, and confirm turn 1 always writes the cache while every later turn reads it.

## Deploy it free

It is a static page (`index.html` + `calc.js`), so GitHub Pages hosts it for $0. See `publish-guide.html` for the click path, or any static host works.

## Why I built it

Every token calculator I could find prices an agent loop like a stack of identical, independent API calls. That is not how an agentic loop works: Claude Code and similar agents resend the same system prompt and tool definitions on every turn, and Anthropic's prompt caching makes that repeated prefix dramatically cheaper starting on turn 2. A calculator that ignores this either overstates or understates your real cost, depending on how big your prefix is relative to your turns. I built the one that gets the caching math right and shows you the difference next to what a plain calculator would have told you.

## License

MIT. See [LICENSE](LICENSE).
