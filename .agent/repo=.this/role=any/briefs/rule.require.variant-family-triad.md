# rule.require.variant-family-triad

## .what

when a practice (or any declared family) IS split along an axis of variation, it must take a TRIAD
shape: the common half in `<x>-any`, beside the variant halves `<x>-<a>` / `<x>-<b>`. the bare `<x>`
is RETIRED inside a split family — every member carries a suffix.

the worked axis here is runtime: `<x>-any` + `<x>-node` + `<x>-expo`. but the rule is general — any
split axis (runtime, cloud, tier) takes the same shape.

## .why

- a bare `<x>` beside `<x>-expo` is an unmarked default, and "an unnamed default is an invisible
  decision" — the exact trap this repo's own `sortable`/`ordered` domain-terms lesson was paved to
  prevent. a reader cannot tell whether `pnpm` is "the common half" or "the node half" or "the old
  one"; the suffix removes the guess.
- `-any` marks the common half explicitly and symmetric with its variants, so the three read at a
  glance as one family. it mirrors this repo's extant `role=any` idiom (= "applies to all"), so a
  reader already knows the sense.
- the retirement of the bare `<x>` forecloses drift: with no unmarked member, no one can quietly add
  content to `<x>` that belongs in `<x>-any` or a variant.

## .the rule

| the family is... | the name is... |
|------------------|----------------|
| NOT split (one practice, all cases) | bare `<x>` — a suffix would be noise |
| split along an axis | `<x>-any` (common) + `<x>-<variant>` per variant; NO bare `<x>` |

`-any` earns its suffix only inside a split family — a practice with no variants stays a bare `<x>`,
because no variant exists to contrast with it.

## .examples

### 👍 good — a justified runtime split (the real `typescript` triad)

```
typescript-any    # the runtime-agnostic typecheck half — `tsc --noEmit`, shared by all
typescript-node   # the node build — tsc + tsc-alias, node20 tsconfig, the `artifact` conditional
typescript-expo   # the expo build — `expo export --platform web`, `expo/tsconfig.base`
```

(the `tests-any`/`tests-node`/`tests-expo` split is the same shape: `-any` holds the jest deps +
test commands, `-node` the `@swc/jest` config, `-expo` the jest-expo preset configs.)

### 👎 bad — a bare default beside a variant

```
typescript        # is this the common half? the node half? the old one? unmarked = a guess
typescript-expo   # only the variant is marked
```

### the counter-case — NOT every runtime delta forks (see `rule.avoid.runtime-forks`)

`pnpm` is deliberately NOT a triad: an expo repo needs only ~8 extra hoisted-linker `.npmrc` lines
atop the shared `packageManager` pin, so the delta is bounded and the shared core dominates. that
is served by ONE usecase-aware `node` practice (its `.npmrc` branches on `context.projectPractices`),
not a `pnpm-any`/`pnpm-node`/`pnpm-expo` split. reach for the triad only once a single usecase-aware
practice is proven untenable.

## .enforcement

- a split practice family that keeps a bare `<x>` beside a `<x>-<variant>` = blocker.
- a split family whose common half is NOT named `<x>-any` (e.g. `<x>-common`, `<x>-base`, or left
  bare) = blocker.
- a practice with no variants that carries a needless `-any` suffix = nitpick (a suffix with no
  variant to contrast).

## .see also

- `rule.avoid.runtime-forks` — WHETHER to split at all (this rule governs only the name, once split)
- `domain.terms/term=sortable._.choice.reason.md` — "name the default", the invisible-decision
  lesson this rule applies
