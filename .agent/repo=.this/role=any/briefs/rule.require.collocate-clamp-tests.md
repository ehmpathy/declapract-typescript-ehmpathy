# rule.require.collocate-clamp-tests

## .what

a **clamp test** that tests ONE best-practice template file lives **collocated with that file**,
inside `best-practice/`, at the same path — and is named for the file it clamps:
`<clamped-file-basename-with-ext>.declapract[.integration].test.ts`.

```
best-practice/src/.test/useKeyrack.ts
best-practice/src/.test/useKeyrack.ts.declapract.test.ts              # clamps ./useKeyrack.ts
best-practice/src/.test/useWakeOfLivedb.ts
best-practice/src/.test/useWakeOfLivedb.ts.declapract.integration.test.ts  # clamps ./useWakeOfLivedb.ts
```

a **clamp test** = a `.declapract.test.ts` (unit) or `.declapract.integration.test.ts` (integration)
whose subject is a single shipped template file — it imports/transpiles that file and asserts its
behavior. it is NOT a declaration (`.declapract.ts`) and NOT an `executeApply` pipeline test.

## .why

- **collocation** — the test sits beside the file it clamps, so a maintainer who opens the template
  finds its clamp in the same dir, named after it. no hunt across a practice-root pile.
- **declapract's compile strips it, so it never ships.** `compile` (the publish step) filters out
  `.declapract.test.ts` (+ `.snap`) before it copies a practice into the distributed package, so a
  clamp test inside `best-practice/` is neither published nor applied to a consumer — even though
  best-practice files are otherwise templates the loader enforces (`define.declapract-test-files`).
- **named for its subject** — a clamp test carries the clamped file's full basename with `.ts`
  (`useKeyrack.ts.declapract.test.ts`, not `useKeyrack.declapract.test.ts`), so the pair reads at
  a glance and matches the `jest.unit.env.ts.declapract.test.ts` precedent.

## .the test

> **does this test clamp exactly ONE best-practice template file?**

- yes — it imports/transpiles one shipped file and asserts its behavior → **collocate it beside that
  file, inside `best-practice/`, named `<file>.declapract[.integration].test.ts`**
- no — it runs `executeApply` against the whole practice, or spans several files by source-text →
  **practice root** (`src/practices/<p>/.declapract.integration.test.ts`), per
  `rule.require.declapract-integration-tests`

## ⚠️ .the caveat — the integration variant lives at the practice ROOT until #109

`compile` today strips only `.declapract.test.ts` (+ `.snap`), NOT `.declapract.integration.test.ts`
(`'x.declapract.integration.test.ts'.endsWith('.declapract.test.ts')` is `false`). so an **integration**
clamp test collocated in `best-practice/` **would ship** and be applied as an EQUALS template to a
consumer — a live consumer break (#583).

so, until the compile filter is extended:

- a **unit** clamp test (`.declapract.test.ts`) + its `.snap` → **collocate** inside `best-practice/`,
  beside its subject. compile strips both, so neither ships.
- an **integration** clamp test (`.declapract.integration.test.ts`) + its `.snap` → **practice ROOT**
  (`src/practices/<p>/<subject>-<facet>.declapract.integration.test.ts`), with `SOURCE_PATH` pointed
  back at the shipped `best-practice/…` template it clamps. the root keeps it out of the emission set
  while it still clamps the template by path.
- the fix-at-cause is a one-line filter extension in `ehmpathy/declapract` — dispatched as
  `ehmpathy/declapract#109`. once it lands, the integration variant may collocate too.
- the `practiceTestFileLocation` clamp (#583) enforces this split: it reddens on any
  `.declapract.integration.test.ts` (or un-stripped `__snapshots__/` file) under `best-practice/`.

## .examples

### 👎 bad — a clamp test exiled to the practice root, mis-named

```
src/practices/tests-node/useKeyrack.declapract.test.ts        # far from the file; drops the .ts
```

### 👍 good — collocated inside best-practice, named for its subject

```
src/practices/tests-node/best-practice/src/.test/useKeyrack.ts
src/practices/tests-node/best-practice/src/.test/useKeyrack.ts.declapract.test.ts
src/practices/tests-node/best-practice/src/.test/__snapshots__/useKeyrack.ts.declapract.test.ts.snap
```

### 👍 good — an executeApply pipeline test stays at the practice root

```
src/practices/persist-with-rds/bad-practices/terraform-parameters/.declapract.integration.test.ts
```

it applies the whole practice against a fixture; it clamps no single template file, so it is not
collocated.

## .enforcement

- a single-file clamp test placed at the practice root instead of beside its subject inside
  `best-practice/` = **nitpick** (relocate + collocate)
- a clamp test named without the clamped file's full basename+`.ts`
  (`useKeyrack.declapract.test.ts` for `useKeyrack.ts`) = **nitpick** (rename)
- an `executeApply` pipeline test collocated inside `best-practice/` as though it clamped one file =
  **blocker** (it belongs at the practice root; collocation mis-states its subject)

## .see also

- `define.declapract-test-files` — the mechanism: how compile strips clamp tests and the loader
  templatizes every other best-practice file
- `rule.forbid.test-assets-in-src` — why the collocated helper + its clamp live at `src/.test/`
- `rule.require.declapract-integration-tests` — the `executeApply` pipeline test that stays at the
  practice root
- `declapract-check-semantics`, `declapract-default-check-equals` — best-practice files default to
  EQUALS templates (why an un-stripped clamp test would ship)
