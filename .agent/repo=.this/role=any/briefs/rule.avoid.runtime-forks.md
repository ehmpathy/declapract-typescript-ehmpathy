# rule.avoid.runtime-forks

## .what

a declapract practice is one unmarked `<x>` by default. when its content must differ by runtime
(node vs expo/metro), make the SINGLE practice usecase-aware first — branch its `contents` / `check`
on `context.projectPractices`. a fork into a `<x>-{node,expo}` family is a LAST RESORT, reached only
when a single usecase-aware practice is truly untenable.

## .why

- a fork doubles the surface: two practices to author, test, and hold in sync, where one
  usecase-aware practice would do.
- declapract already hands you the tool to avoid it: a `contents` fn reads `context.projectPractices`
  and can emit different content per usecase. the `typescript-node` practice does this today — it
  strips ` && npm run build:artifact` from its package.json when the `artifact` practice is absent.
- most runtime differences are a few lines (a `.npmrc` block, a tsconfig extend, a jest preset), not
  a whole divergent practice. a conditional single practice keeps the common core in one place, so
  it cannot drift between variants.
- a fork is sometimes right — when the shapes diverge so far that one conditional practice reads
  worse than two. so this is an `avoid`, not a `forbid`. but it is the earned exception, never the
  reflex.

## .the preference — usecase-aware FIRST, triad LAST

the usecase-aware single practice is the PREFERRED shape. the `<x>-any` + `<x>-node` + `<x>-expo`
triad (`rule.require.variant-family-triad`) is the fallback, reached only when the single practice is
untenable. rank them:

1. **usecase-aware single practice** (preferred) — one practice, branch `contents`/`check` on
   `context.projectPractices`. no new practice, no name split, the common core stays in one place.
2. **triad fork** (last resort) — split into `<x>-any`/`<x>-node`/`<x>-expo`. only when a reviewer
   agrees a single conditional practice would read worse than the split.

## .when to reach for each

the discriminant is **does the shared core dominate, or does the divergence?**

| the runtime delta is… | reach for | why |
|-----------------------|-----------|-----|
| a bounded edit to shared content — a few lines appended/swapped in one (or a couple) files, common core dominates | usecase-aware single practice | the branch reads as one clean conditional; the shared core cannot drift |
| a wholesale divergence — node and expo files share almost no content, OR the variance sprawls across many files/checks such that the conditionals bury the practice's intent | triad fork | one conditional practice would read worse than two; the split is legible |

worked example (the preferred case): the `node` practice's `.npmrc` is 3 shared lines
(`engine-strict`, `save-exact`, `message`); an expo repo appends ~8 hoisted-linker lines. shared core
dominates, delta is bounded and localized → usecase-aware, in-place, `node` stays a bare `node` (no
fork, no `-any` suffix — a practice that ADAPTS is not a practice that is SPLIT).

## .the test

before you fork, answer: "can one usecase-aware practice serve both runtimes?"

- yes → do NOT fork. branch the single practice on `context.projectPractices`.
- no, and a reviewer agrees the conditional practice reads worse than two → fork, then apply
  `rule.require.variant-family-triad` for the name shape.

the reviewer challenges every proposed fork with "why can't one usecase-aware practice do this?"

## .how — make a practice usecase-aware

```ts
// package.json.declapract.ts
export const contents: FileContentsFunction = async (context) => {
  const base = await readFile(`${__dirname}/package.json`);
  // emit the expo-shaped line only when the expo usecase is in play
  if (context.projectPractices.includes('cicd-app-react-native-expo'))
    return base.replace('"build": "tsc ..."', '"build": "expo export ..."');
  return base;
};
```

## .caveat — usecase-aware + EQUALS is SCOPE-SENSITIVE (know this before you reach for it)

the usecase-aware branch keys on `context.projectPractices`. declapract derives that list AFTER any
`--practice` filter is applied (`getScopedPractices` → `getPlansForProject`:
`projectPractices = practices.map(p => p.name)`). so a NARROW invocation —
`declapract fix --practice <x>` — makes `projectPractices === ['<x>']`, and the branch that tests
`includes('cicd-app-react-native-expo')` goes DARK even on an expo repo.

whether that dark branch is harmless or destructive depends on the CHECK TYPE:

| check | narrow-scope effect | verdict |
|-------|---------------------|---------|
| `CONTAINS` | the expo-only additions are simply not required — a superset file still passes | harmless (only LOOSENS) — the `typescript-any`/`format`/`tests-any` practices are all CONTAINS |
| findsert (check/fix union) | the fix only APPENDS absent declared lines — a correctly-hoisted file is left intact | harmless — a narrow-scope fix is a no-op on an already-conformant file |
| `EQUALS` | the emitted contents revert to the base, and the check REWRITES the file to base on `fix` — it drops the expo-only lines | **destructive** — a scoped `fix` can strip a correct file |

so a usecase-aware declaration whose expo delta is ADDITIVE must never use EQUALS — reach for
CONTAINS, or a findsert (a `check`/`fix` pair that unions the declared lines into the repo's extant
file, like the repo-root `.gitignore`). both are scope-safe by construction: a narrow `--practice`
fix cannot strip a line it only ever appends. reserve EQUALS for a whole-file shape that carries no
usecase-conditional lines.

worked example: `src/practices/node/best-practice/.npmrc.declapract.ts` — a findsert
(`defineExpectedNpmrcContents` unions the base + expo-hoist lines into the repo's extant `.npmrc`),
so a narrow `declapract fix --practice node` on an expo repo preserves the metro hoist rather than
strips it. see also `howto.pnpm-expo-hoisted-linker.md`.

## .enforcement

- a `<x>-{node,expo}` fork proposed where a single usecase-aware practice would serve both = nitpick
  (fix: branch the one practice on `context.projectPractices`).
- a fork with NO recorded reason why a conditional single practice was untenable = nitpick.
- a usecase-aware declaration with an ADDITIVE expo delta that uses `EQUALS` (so a narrow
  `--practice` fix strips the usecase-only lines) = nitpick — use CONTAINS or a findsert union instead.

## .see also

- `rule.require.variant-family-triad` — the name shape a JUSTIFIED fork must take
- `howto.craft-practice-migrations` — usecase-aware `contents` fns in practice
- `domain.terms/term=sortable._.choice.reason.md` — the "name the default" lesson behind the triad
