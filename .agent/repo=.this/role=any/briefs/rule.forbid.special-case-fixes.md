# rule.forbid.special-case-fixes

## .what

a practice prescribes one shape. its fix converges every adopter onto that shape. it never carries
a branch that keeps, translates, or folds an adopter's prior variant.

a **special case** is a branch in a `check` or `fix` keyed on the adopter's prior shape:
- a translation of the adopter's old value into a new form (fold, rebase, remap)
- a per-variant key, value, or note that keeps a non-template shape alive
- a manual practice that exists only to flag a variant the fix could replace

## .why

- each special case is a code path to test and maintain, and it is needed only by the repos that
  still hold the old shape. the cost grows with every variant; the benefit shrinks with every upgrade.
- a translated variant keeps two shapes alive across the fleet, which is the opposite of what a
  practice is for.
- a hard break that fails loud is cheaper than a quiet accommodation: the adopter's compiler or test
  names the site, and the adopter fixes it once.

## .the shape of a compliant fix

1. replace the adopter's value with the template's. drop removed options at any value.
2. let what depended on the old shape break loud (a compile error, a failed test), never silent.
3. state the break in one line of the practice readme: what fails, and the one move that fixes it.

the adopter's own content outside the prescribed shape is left alone (a repo's own extra alias or
dependency). to leave it alone is not a special case: no branch reads it.

## .the test

for each branch in a `check` or `fix`: **does it read the adopter's prior variant to decide what to
write?**

- yes → a special case. delete the branch and write the template shape.
- no → a plain convergence. keep it.

a readme that lists more than one break, or explains how a variant is preserved, is the same smell
from the outside.

## .the exception

a break that would fail silent (wrong output at runtime, data loss, an artifact that ships broken
with green ci) earns a guard: either a check that fails loud, or a fix that removes the hazard. that
is not an accommodation of the variant, and the readme names it as a break.

## .enforcement

- a fix branch that translates or preserves an adopter's prior variant = **blocker**
- a manual practice whose only job is to flag a variant the fix could replace = **blocker**
- a practice readme that documents how variants are kept, instead of one break line = **nitpick**

## .see also

- `rule.forbid.special-case-fixes.example=ts7-baseurl-fold.md` — the episode that set this rule
- `rule.require.idempotent-fixes.md` — a converged fix is a fixed point
- `rule.avoid.runtime-forks.md` — the same pressure on the practice axis: one shape, not a family
