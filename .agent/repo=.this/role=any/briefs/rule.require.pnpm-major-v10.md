---
name: rule.require.pnpm-major-v10
description: pnpm stays on major v10.x forever; v11+ is forbidden, because the whole practice set is built on the v10 build-allowlist model, v11 inverts it into destructive defects, and v11 forces a second config file (pnpm-workspace.yaml) where v10's package.json already suffices
type: rule
---

# rule.require.pnpm-major-v10

## .what

the `pnpm` practice pins `packageManager` to a **v10.x** version, and every mirror of that pin
across the pnpm practice holds a v10.x value. **v11 and above are forbidden.** a bump within v10.x
is fine (a newer patch or minor); a bump that crosses the major boundary to v11 is a blocker.

## .kind

**nurture.** no property of pnpm forces v10 on us — v11 installs and runs. we choose v10 for two
reasons: the whole practice set encodes the v10 build-allowlist model, and a cross-major bump would
silently invert several practices; and v10 keeps that config in `package.json` alone, where v11
would force a second `pnpm-workspace.yaml` for a setting one file already holds. to overturn it,
migrate that model to v11's shape first (see `.what would overturn it`), then the choice is free to
change.

## .the invariant

> `packageManager: pnpm@10.x.y` in every pnpm-practice surface. a pin whose major is `>= 11` = blocker.

## .why

pnpm changed its build-allowlist model at the v10→v11 boundary, and this library's practices are
built on the v10 shape:

| model | v10 (what we use) | v11 (what breaks us) |
|---|---|---|
| where the allowlist lives | `pnpm.onlyBuiltDependencies` (array in `package.json`) | `allowBuilds:` (map in `pnpm-workspace.yaml`) |
| who writes it | the author, by hand | pnpm v11 **auto-writes** it on a non-interactive install (pnpm#11574) |
| config files needed | one — `package.json` alone | two — a second `pnpm-workspace.yaml`, since v11 no longer reads the `package.json` `pnpm` field at all |

so under a v11 pin:

- the `inert-build-allowlist` bad-practice reads `allowBuilds:` as inert leftover and deletes it —
  but under v11 that key is the LIVE allowlist, so the delete is destructive. the bad-practice's own
  premise (`allowBuilds:` is inert v11 syntax the v10 pin never emits) becomes false, which converts
  a valid detect-and-remove into a valid-shape-removal.
- pnpm v11 auto-writes `allowBuilds:` on install, so a repo re-grows the exact file the bad-practice
  removes — an oscillation between the tool and the practice on every install.
- the `onlyBuiltDependencies` array the v10 practices expect is no longer the allowlist pnpm reads,
  so the build-consent the array encodes is silently dropped.
- v11 forces a **second config file**. in v10 the build-allowlist lives in `package.json`, which
  every repo already has — one file, no extra surface. v11 reads no `package.json` `pnpm` field, so
  the allowlist can only live in a new `pnpm-workspace.yaml`. we do not want a second config file for
  a setting `package.json` already holds, and v11's stricter workspace-settings validation (an
  unrecognized key throws `ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS` under a satisfying pin) makes
  that extra file a new fault surface, not a free one.

the fault is the wish's own meta-lesson in miniature — a practice that emits a **value** (the pin)
cannot verify what that value implies downstream. a v11 pin type-checks, installs, and passes every
gate, then inverts a sibling practice at a consumer's install time where no gate can see it.

## .the test

the pnpm integration test asserts the exact v10.x pin as an intentional org-standardization
requirement, and proves the `CONTAINS` merge rewrites an off-pin repo forward to it. `[case4]`
proves the `inert-build-allowlist` bad-practice removes `allowBuilds:` precisely because the v10 pin
never emits it. a pin `>= 11` breaks the docblock premise and the bad-practice at once.

## .how a bump moves every mirror together

a v10.x bump (patch or minor) must land in all pnpm-practice surfaces in one change, or the
assertions and the template diverge:

- `best-practice/package.json` — the pin itself
- `best-practice/package.json.declapract.ts` — the docblock's cited pin
- `best-practice/.declapract.readme.md` — the readme's cited pin
- `bad-practices/inert-build-allowlist/pnpm-workspace.yaml.declapract.ts` — the docblock's cited v10 premise
- `.declapract.integration.test.ts` — the asserted pin + seed comments
- `.test/assets/repo-npm-to-pnpm/package.json` — the no-op seed
- `__snapshots__/.declapract.integration.test.ts.snap` — regenerate via a resnap run, never hand-edit

## .what would overturn it

the rule holds only while the practices encode the v10 build-allowlist model. it is overturned when
someone migrates that model to v11's shape — the `inert-build-allowlist` bad-practice rewritten to
treat `allowBuilds:` as live (not inert), the `onlyBuiltDependencies` array practices repointed at
the `pnpm-workspace.yaml` map, and the auto-write behavior (pnpm#11574) reconciled with declapract's
idempotent-fix contract. once that migration lands and its tests pass, the v10 floor may lift.

## .enforcement

- a `packageManager` pin whose major is `>= 11` in any pnpm-practice surface = **blocker**
- a v10.x bump landed in some mirrors but not all = **blocker** (the pin and its assertions diverge)
- a bump within v10.x (patch or minor), landed across every mirror together = **allowed**

## .see also

- `src/practices/pnpm/best-practice/package.json.declapract.ts` — the pin declaration
- `src/practices/pnpm/bad-practices/inert-build-allowlist/` — the bad-practice a v11 pin inverts
- `src/practices/pnpm/.declapract.integration.test.ts` — the test that clamps the pin + `[case4]`
- `rule.require.idempotent-fixes` — why the pnpm-v11 auto-write oscillation violates the fix contract
