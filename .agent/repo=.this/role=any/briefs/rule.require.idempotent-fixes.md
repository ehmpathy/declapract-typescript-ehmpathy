# rule.require.idempotent-fixes

## .what

every fix — a declapract `.declapract.ts` fix, a migration operation, a provision
wish, any transform that runs against live or persisted state — must be **idempotent**:
run it once, run it ten times, the end-state is identical and the reruns are no-ops.
you must PROVE this with a test that applies the fix twice (or against
already-fixed input) and asserts the second run changes zero.

## .why

a fix rarely runs exactly once. declapract fixes rerun on every `declapract fix`.
provision wishes replan/reapply on every push. migration ops rerun on retry, on the
next env, after a partial failure. a fix that is correct once but destructive twice is
a latent incident:

- a generator that appends instead of unions → duplicates grow on each run
- a migration that reads-and-overwrites → clobbers the value it just wrote
- a forget-rewrite that re-matches its own output → corrupts on the second pass
- a seed that reseeds → overwrites a rotated secret with the stale prior

the second run is where these bugs live, and a single-run test never sees them.

## .the idempotency test

apply twice; assert the second run is a no-op. the shapes:

### declapract fix — apply to already-fixed input

```ts
// the fix's own output must be a fixed point
const once = fix(input, context).contents;
const twice = fix(once, context).contents;
expect(twice).toEqual(once); // second pass changes zero
```

and its `check` must PASS on the fixed output (so `declapract fix` stops, not loops):

```ts
expect(() => check(once, context)).not.toThrow(); // best-practice: satisfied
// or, bad-practice: check THROWS on fixed output (bad pattern no longer detected)
```

### integration — run the real pipeline twice

```ts
useThen('first apply', async () => executeApply({ config, practice, file }));
const after1 = await read(targetPath);
useThen('second apply', async () => executeApply({ config, practice, file }));
const after2 = await read(targetPath);
then('second apply is a no-op', () => expect(after2).toEqual(after1));
```

### migration / provision op — rerun against its own end-state

seed the fake/live state with the OUTCOME of a prior run, then assert the op decides
KEEP / no-op and performs no write:

```ts
// into already exists (post-move steady state)
const result = await migrateSecret({ from, into }, { ...ports });
expect(result).toBeUndefined();        // KEEP, no reseed
expect(writeCalls).toEqual([]);        // no mutation on rerun
```

## .the questions to ask of every fix

1. **is my output a fixed point?** feed the fix its own output — does it change?
2. **does my check agree the fix is done?** after fix, does `check` pass (best) or
   fail-to-detect (bad)? if not, `declapract fix` loops or reflags forever.
3. **can my match re-match my output?** a regex that rewrites `X`→`Y` must not also
   match `Y`. (e.g. a forget-rewrite must skip files that already hold only
   `removed{}` blocks.)
4. **does a rerun overwrite live state?** for stateful ops, an existence/KEEP guard
   must gate any write — read-before-write, never blind write.
5. **is the existence check cheap and safe on rerun?** prefer a metadata check
   (e.g. SSM DescribeParameters) over a value read (GetParameter+decrypt) for the
   KEEP decision, so the rerun path is both cheap and low-privilege.

## .worked example

the `terraform-parameters` forget-rewrite (bad-practice) turns each
`resource "aws_ssm_parameter"` into a `removed{}` forget block. idempotency rides on the
match: the fix regex targets `resource "aws_ssm_parameter"`, which a `removed{}` block
does NOT contain — so a second pass finds no match and returns the file unchanged, and
the bad-practice `check` no longer detects the pattern (it throws-to-skip). the test
proves the fixed output is a fixed point (`fix(fix(x)) === fix(x)`) and that `check` on
that output skips — so a re-run of `declapract fix` is a clean no-op, not a re-rewrite.

the paired declastruct-aws wish is idempotent for the same reason at the live layer: a
value-less `DeclaredAwsSsmParameterSecure` reports KEEP for every extant param (a
DescribeParameters metadata check, no decrypt, no write) — so a replan on every push is
a clean no-op, never a reseed.

## .anti-patterns (each an idempotency break)

| pattern | breaks on rerun because |
|---------|-------------------------|
| append to a list | list grows every run — union/dedupe instead |
| blind overwrite of live value | clobbers a value changed since the prior run |
| regex whose output its own pattern matches | corrupts on the second pass |
| `check` that still flags fixed output | `declapract fix` loops / reflags forever |
| create without exists-guard | duplicates or errors on the param that now exists |

## .enforcement

- a fix with logic and no twice-applied (idempotency) test = blocker
- a fix whose `check` does not pass on its own fixed output = blocker
- a stateful op that writes without a read-before-write KEEP guard = blocker

## .see also

- `rule.require.declapract-integration-tests` — the pipeline test these reruns extend
- `howto.craft-practice-migrations` — migrations are the highest-risk rerun surface
- `rule.require.idempotent-procedures` (mechanic practices) — the general principle
