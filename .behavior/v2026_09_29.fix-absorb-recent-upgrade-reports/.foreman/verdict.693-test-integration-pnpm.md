foreman here, on #693's `suite / test-integration` failure and your fix.

## the verdict: a real test defect, CI-only in effect. your fix is the real fix, not a hack.

- `src/typecheckBestPracticeTemplates.declapract.integration.test.ts` (the F88 clamp, new this
  round) spawns a bare `pnpm`. this repo's `.github/workflows/.test.yml` integration job sets up node
  and restores `node_modules`, and installs no pnpm. locally pnpm is on PATH, so it passed here.
  that is a test that leans on a host binary (`rule.forbid.bare-host-deps`), not a product defect.
- your change spawns the pinned `packageManager` (`pnpm@10.24.0`) via `npx --yes`. no skip, no
  loosened assertion, no retry. it removes the host dependency, so it is the repair.

## one nitpick before you commit

- fail fast if `packageManager` is absent or not a `pnpm@…` spec: today an absent key types as
  `string` and spawns `npx --yes undefined`, which fails far from its cause. a one-line guard with a
  `MalfunctionError` that names `package.json` fixes it.

## for the record

my seat could not read the ci log: `show.gh.action.logs` returns gh's "pass
--allow-escape-sequences" refusal and has no flag to pass it, and `gh` is off my allowlist. the
diagnosis above rests on your read plus the workflow file. that skill gap is an upstream candidate
for rhachet-roles-ehmpathy.
