# Parking lot: agent-loop-cost-calculator

Ideas that came up during the build but are out of v1 scope. Not started.

- **Auto-fill from a real Claude Code transcript.** Read an actual session log (brief 08) and derive system-prompt tokens, tool-def tokens, per-turn tokens, and turn count automatically instead of hand-entering them.
- **Break-even line.** State the exact turn number where caching starts saving money for the current inputs ("caching pays off after turn 2 on this loop"), instead of only the current 1-vs-2-turn edge case in the conclusion sentence.
- **Shareable permalink.** Encode the current scenario in the URL query string so a link reproduces the exact inputs, still client-side only.
- **Rolling cache of the growing history.** The current model only caches the fixed system+tools prefix; a more advanced (and more complex) mode could model Claude Code's actual rolling cache breakpoints over the growing transcript too. Bigger build, explicitly deferred so v1 stayed to the one defensible slice the brief asked for.
- **More platforms/models.** Additional Claude model variants, or other providers' cache-discount mechanics, if a screener asks for it.

None of these are v1. If pulled forward later, treat each as its own small addition, not a rewrite.
