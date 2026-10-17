# rule.forbid.overgranular-maintenance-farms

## .what

no practice ships a hand-kept list, gate, or job whose only payoff is a saved ci minute or an
earlier diagnosis. keep it simple.

a **maintenance farm** = an artifact that must be tended by hand to stay correct: a `paths:` list
that must track every input a workflow reads, a provider→key map that must track every brain an
adopter enrolls, a skip list that must track every file a step touches.

## .why

- **every adopter pays per line, forever.** a practice reaches every repo that uses it. a line that
  must be tended is tended in each of them, on each upgrade.
- **a stale list fails silent.** a `paths:` gate that misses one input lets a change merge
  unplanned; the cost of the miss dwarfs the minute the gate saved.
- **the payoff is small and the drift is certain.** a saved plan, a failure surfaced one step
  sooner — neither repays a list that rots the moment an adopter adds an input.

## .the test

before you ship a list, gate, or job, ask: **"what breaks if this is absent?"**

- a defect ships, or a check can never pass → it earns its place
- only a ci minute is spent, or a failure is diagnosed one step later → drop it

## .examples

| 👎 farm | 👍 simple |
|---|---|
| a `pull_request: paths:` gate that lists every plan input, to skip a cheap plan | a bare `pull_request:` — every pr plans |
| a preflight job with a provider→key map, to fail before the shards fan out | the suites fail on the rejected key themselves |

## .enforcement

- a hand-kept list, gate, or job whose only payoff is ci time or an earlier diagnosis = **blocker**

## .see also

- `rule.forbid.key-health-checks-in-cicd` — the key-health instance of this rule
