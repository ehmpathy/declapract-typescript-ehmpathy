# F56 — #680: a stale patch is retired by a fix, a failed patch only warns

- **fork:** (a) both pnpm keys, and pnpm's warn is the whole treatment; (b) both keys, plus a
  `stale-patched-dependency` bad-practice that deletes each `pnpm.patchedDependencies` entry (and its
  `patches/` file) whose keyed version no longer equals the version package.json declares — #670's
  mechanism, generalized past sdk-aws-lambda.
- **taken:** (b). a stale patch can never apply again, so a delete loses no behavior, and the
  delete shows in `plan` as an ordinary fix line — never a manual halt. a failed patch (same
  version, content no longer applies) is only knowable at install, so it keeps pnpm's warn.
- **rework:** clean — drop the bad-practice; the two keys stand alone.
- **confidence 70%, low because:** a declared range (`^1.2.0`) with a patch keyed on the resolved
  `1.2.3` reads as a mismatch from package.json alone; the check must read the lockfile's resolved
  version, or skip any non-exact declaration.
- **where:** `pnpm/bad-practices/stale-patched-dependency/` (new); #670's sdk-aws-lambda case
  becomes one instance of it.
- **verdict:** —
