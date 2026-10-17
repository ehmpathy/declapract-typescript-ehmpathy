# rule.forbid.key-health-checks-in-cicd

## .what

no practice ships a ci job or step that checks whether a credential is valid, unexpired, or
accepted by its provider. key health belongs to two owners:

1. **the test suite author** — a suite that needs a key fails loud when the key is rejected
   (`rule.require.failfast`, `rule.require.failloud`)
2. **keyrack** — a keyrack healthcheck verifies the keys it holds, at unlock or on demand

never ci.

## .why

- **the suite already detects it.** a rejected key fails the test that uses it, with the provider's
  own error. a second check in ci duplicates that signal.
- **a ci key check is a maintenance farm.** it must track which keys each adopter needs and which
  provider each key reaches; every adopter tends that map forever
  (`rule.forbid.overgranular-maintenance-farms`).
- **the fix lives with the keys.** a stale key is rotated in keyrack. a healthcheck there catches
  the stale key before any run, on every machine, not just in ci.

## .the test

does this ci job or step exist to tell whether a key works?

- yes → drop it. let the suite fail loud, or ask keyrack for a healthcheck
- no → out of scope

## .enforcement

- a ci job or step whose purpose is to verify a credential = **blocker**

## .see also

- `rule.forbid.overgranular-maintenance-farms` — the general rule
