# F-budget-findsert-add

## the fork

the wisher asked to "findsert the budget to 5k always, even if the file already exists". a fresh
consumer gets the whole template block — the `budget:` key **with** its explanatory comment. but the
findsert into an **extant** consumer's boot.yml adds only the bare key, via the yaml document api:

```yaml
budget:
  tokens: 5000
```

no comment. the fork: findsert the minimal key (what i did), or lift the template's full commented
budget block (its `commentBefore` node) into the consumer so an upgraded repo gets the rationale too.

## taken, and why

findsert the **minimal** key. reasons:

- a findsert is minimal by contract — it ensures the concern is present, it does not re-home the
  template's prose. the two ref globs are findserted the same bare way (no comment).
- to lift a node's `commentBefore` across yaml documents is fragile and would place the multi-line
  comment at a position the yaml serializer chooses, not one i control — a snapshot-churn risk on
  every unrelated re-apply.
- the cap's sense is documented at the template's declaration and in the boot.yml.declapract.ts
  docblocks; an extant consumer that wants the rationale reads it there.

## rework

**clean.** if the wisher prefers the commented block, the fix would lift the declared budget node
(with its `commentBefore`) instead of `doc.setIn(['budget','tokens'], 5000)` — a one-function change
in `defineExpectedContents`, with a re-snap. no consumer breaks either way.

## confidence

**65%.** the minimal-key choice matches the extant ref-glob findsert precedent, which is why it is the
default. lower confidence because the wisher values the budget comment (they dictated the whole block
with its rationale), so they may want an upgraded consumer to inherit it too.

## where

- `src/practices/rhachet/best-practice/.agent/repo=.this/role=any/boot.yml.declapract.ts`
  (`defineExpectedContents`, the `budgetAbsent` branch)

## verdict

_(awaited — end-of-drive council)_
