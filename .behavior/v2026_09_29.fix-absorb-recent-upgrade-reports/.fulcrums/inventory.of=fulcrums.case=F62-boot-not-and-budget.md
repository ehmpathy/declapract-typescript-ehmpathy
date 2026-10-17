# F62 — #689: `not:` plus the rhachet 1.49.2 floor; the budget seed keeps the adopter's own value

- **fork:** (a) template `ref` → `not`, floor 1.49.2, and the 5000-token budget seed kept as is;
  (b) the same, but the budget becomes a findsert that keeps an adopter's own `budget:` and seeds
  5000 only where absent, with an upgrade note that names the boot halt and its remedy (raise the
  budget or demote a brief to `ref`); (c) hold the floor; the check accepts a declared glob in
  either `ref` or `not`.
- **taken:** (b). below 1.49 `not:` is dropped silently and the variants load at `say` — worse than
  today, so the move needs the floor. but 1.49 enforces the budget the practice already writes, so a
  bare floor raise turns an inert cap into a boot halt; seed S10 asks that an upgrade never block.
  an adopter's own value survives, and a clamp proves this repo's own `say` payload fits.
- **rework:** clean — (c) is a smaller check change.
- **confidence 55%, low because:** whether 5000 fits a typical consumer is unmeasured; if it does
  not, the right default may be no hard budget at all.
- **where:** `rhachet/best-practice/.agent/repo=.this/role=any/boot.yml(.declapract.ts)`,
  `rhachet/best-practice/package.json`.
- **verdict:** —
