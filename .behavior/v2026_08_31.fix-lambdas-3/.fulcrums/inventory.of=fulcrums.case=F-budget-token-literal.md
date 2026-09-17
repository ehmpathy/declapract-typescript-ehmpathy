# F-budget-token-literal

## the fork

the wisher dictated the boot.yml budget cap verbatim, twice, as `budget: tokens: 5_000`. i wrote it
into the template that way. the fork surfaced when the findsert test parsed a seeded `9_000`:

- `yaml.parse('tokens: 9_000')` returns the **string** `"9_000"`, not the number 9000.
- yaml v2 (this repo's parser, and the modern default) uses the YAML 1.2 core schema, where an
  underscore integer is **not** numeric. underscores-in-integers is a YAML 1.1 feature.
- so the template's `tokens: 5_000` would silently make `budget.tokens` a **string** — a non-numeric
  cap, the exact silent value-emit defect this whole wish exists to kill.

so the fork: keep the wisher's literal `5_000` (readable, but string-typed and broken), or write
plain `5000` (every parser reads it as the integer 5000).

## taken, and why

wrote `5000` (plain) in both the rhachet template and this repo's own boot.yml, plus a one-line NOTE
comment beside each that names the underscore hazard. the findsert writes the JS number `5000`
(`declaredBudgetTokens`), which serializes to plain `5000` and round-trips as a number.

- the wisher's INTENT is "a 5k-token cap" — a numeric value. `5_000` defeats that intent under the
  installed parser, so `5000` is what actually delivers what was asked.
- this is a representation change local to two template lines + the findsert default; no caller reads
  the raw literal, so it does not ripple. clean.

## rework

**clean.** two yaml literals + one const + the NOTE comments. reversible in one edit if the wisher
prefers the underscore (e.g. if rhachet's #536 parser is confirmed to honor YAML 1.1 underscores, in
which case `5_000` becomes safe again and the readability nicety can return).

## confidence

**80%.** high because the string-parse is empirically demonstrated (the test failure showed
`Received: "9_000"`), so `5_000` is not a style choice but a correctness one under the current parser.
the residual 20% is whether rhachet's coming enforcement (#536) parses with a YAML 1.1 mode that
would restore the underscore's numeric sense — if so, the literal could revert to `5_000` for
readability.

## where

- `src/practices/rhachet/best-practice/.agent/repo=.this/role=any/boot.yml` (template block)
- `.agent/repo=.this/role=any/boot.yml` (this repo's own)
- `src/practices/rhachet/best-practice/.agent/repo=.this/role=any/boot.yml.declapract.ts`
  (`declaredBudgetTokens`)

## verdict

_(awaited — end-of-drive council)_
