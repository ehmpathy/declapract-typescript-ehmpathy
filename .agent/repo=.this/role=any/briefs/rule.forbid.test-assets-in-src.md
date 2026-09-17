# rule.forbid.test-assets-in-src

## .what

a **prod path** under `src/` — `src/utils/`, `src/logic/`, any non-dot path the build bundles — is
reserved for **prod assets**: the code the built artifact ships and runs. a **test-only asset** —
code imported solely by a jest env, a jest globalSetup, or a test file, and never by the artifact —
must NOT live in a prod path under `src/`. it lives at `src/.test/` — a dot-dir **inside** `src/`,
excluded from the tsconfig / jest src globs by its dot prefix.

every test asset stays under `src/`. the one exception is `blackbox/` — the acceptance blackbox
suite, which sits outside `src/` by design. a repo-root `.test/` dir, or any test asset placed
outside `src/` (blackbox excepted), is forbidden.

test-only assets this rule governs: a keyrack-source util, an aws-credential export shim, an
livedb-wake setup, a testdb preflight probe — anything a `jest.*.env.ts` / `jest.*.prepare.ts` /
`*.test.ts` imports and the lambda handler does not.

## .why

- **a prod path under `src/` is the artifact's own tree.** what sits there is bundled, deployed, and
  executed in prod. a test-only asset there is dead weight the artifact ships and never calls — and
  it reads to every future maintainer as prod code, so they wire it into prod by mistake.
- **`src/.test/` keeps the asset inside `src/`, so locality holds; the dot prefix keeps it out of
  the build.** it is test-scoped by exclusion, not by exile to the repo root — so a reader finds the
  test asset beside the code it exercises, and the bundler never ships it.
- **no test asset belongs outside `src/` except in `blackbox/`.** a repo-root `.test/`, or a test
  asset dropped anywhere but `src/`, scatters the test surface across two trees. keep it one, under
  `src/`. `blackbox/` is the sole exception — the acceptance suite that runs against the built
  artifact from outside.
- **a test asset in a prod path invites a prod dependency on test-only code.** once it sits beside
  prod utils, a prod path can import it, and now the artifact carries a keyrack/aws-cred shim it
  should never touch.

## .the test

> **who imports this — the artifact, or the test harness?**

- the artifact (a handler, a domain.operation, a contract) → prod asset → a prod path under `src/`
- only a `jest.*.env.ts` / `jest.*.prepare.ts` / `*.test.ts` → **test asset → `src/.test/`**
  (never a prod path, never outside `src/` — `blackbox/` excepted)

## .where a test asset goes instead

- `src/.test/` — a dot-dir **inside** `src/`, excluded from the tsconfig / jest src globs
- **never** a prod path under `src/` (`src/utils/`, `src/logic/`, …)
- **never** a repo-root `.test/` dir, and **never** a test asset outside `src/`
- the one test surface that sits outside `src/`: `blackbox/`, the acceptance suite

## .examples

### 👎 bad — a test-only util in a prod path

```
best-practice/src/utils/useKeyrack.ts        # imported ONLY by jest.acceptance.env.ts
best-practice/src/utils/useWakeOfLivedb.ts   # imported ONLY by jest.acceptance.prepare.ts
best-practice/src/utils/probeTestDb.ts       # imported ONLY by jest.integration.env.db.ts
```

each ships in the artifact, runs never, and reads as prod code.

### 👎 bad — a test asset exiled to the repo root

```
best-practice/.test/useKeyrack.ts            # outside src/ — the test surface splits in two
```

### 👍 good — under `src/.test/`, beside the code it exercises

```
best-practice/jest.acceptance.env.ts
best-practice/src/.test/useKeyrack.ts        # only the jest env imports it
best-practice/src/.test/useWakeOfLivedb.ts
best-practice/src/.test/probeTestDb.ts
```

### the precedent this rule refuses to follow

a peer repo (`ahbode/svc-notifications`) places `useKeyrack` at `src/utils/useKeyrack.ts`. that is
the exact mis-file this rule forbids — a precedent is a reason to look, never a reason to conform.
ship the util at `src/.test/` instead.

## .enforcement

- a prod path under `src/` (`src/utils/`, `src/logic/`, …) that holds a module imported solely by
  test code (a jest env, a jest globalSetup, or a `*.test.ts`) = **blocker** (relocate to `src/.test/`)
- a repo-root `.test/` dir, or a test asset placed outside `src/` (blackbox excepted) = **blocker**
  (relocate to `src/.test/`)
- a prod path (`src/**`, non-dot) that imports a test-only asset = **blocker** (the dependency the
  mis-file invites)

## .see also

- `rule.forbid.test-assets-dunder` (ehmpathy/mechanic) — the `__test_assets__` naming twin
- `rule.prefer.dot-dirs` (ehmpathy/mechanic) — why a `.test/` dot-dir is the test-scoped home
- `rule.require.hermetic-tests` (ehmpathy/mechanic) — the broader test-isolation principle
- `domain.terms/term=fixture._.choice._.md` — a fixture is a test input, free to hold what a
  template must never hold
