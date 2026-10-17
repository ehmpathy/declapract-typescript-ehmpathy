# S19 — the ref-without-static-key check belongs in domain-objects

## .said

on `src/practices/domain/bad-practices/ref-without-static-key/.declapract.readme.md`:

> this sounds more like a lint rule that should be dispatched into domain-objects instead

## .settled

- a check that guards a library's own api ships with the library, as a lint rule or a type guard;
  a practice library does not carry it. it then reaches every consumer on install.
- `.ref(by)` with no `static <by>` is such a check. the `ref-without-static-key` bad practice leaves
  this repo; #634 defect 2 moves to ehmpathy/domain-objects. #634 defect 1 (`X.contract()` over
  `.schema`) stays here, in `schema-over-contract`.

## .landed

- `domain/bad-practices/ref-without-static-key/` removed
- `domain/contract.declapract.integration.test.ts` proves only the `schema-over-contract` half
- `release.commits.md` #634 section retitled; defect 2 noted as dispatched
- a lint/type-guard task for ehmpathy/domain-objects, held in `.radio/` until the radio lifts
- F24 verdict amended
