# S14 — the template type-check clamp lands in this round

## .said

> fix this here too; a cross-cut the sweep found: this repo's tsconfig includes only `src/**/*.declapract.ts`, so
> best-practice template `.ts` files are never type-checked here — the root cause #632 and #633
> shipped. a type-check clamp over the templates needs their deps resolvable; caught as a dream
> (`.dream/v2026_09_29.fix.typecheck-best-practice-templates.md`).

## .settled

- the root cause behind #632 and #633 is fixed in this round, not deferred: a clamp type-checks
  every best-practice `.ts` template as an adopter compiles it.
- the cost of a per-usecase dep install is not a reason to defer (S2).

## .landed

- F88; inventory § maintainer clamp; yield § groundwork; the dream marked pulled in
