# S5 — no work in other repos; only pull in what is already done

## .said

> no work in other repos

> only pull in what is already done

## .settled

this round changes this repo alone, and leans only on releases that already exist. it publishes no
release elsewhere and files no issue elsewhere.

- a fix whose only safe form needs an unpublished upstream release is held, open, with a comment
  that names the release it waits on. the lambda cluster rests on `sdk-aws-lambda@0.7.1` (the
  `FrozenDeep` guard), so #646, #650, #640, #631 are held together (best-guess, F33).
- a fix that stands on published releases lands, and its upstream follow-up becomes a caught dream
  in `.dream/`, not a filed issue: #607 (declapract leftover report, plan-after-apply), #651
  (`git.repo.test` ACCESS export), #652 (sql-schema-control ssl), #625 (with-domain-driven-cache
  release), #631's later cast removal (sdk-aws-lambda#42).

## .landed

- `1.vision.experience.dimensions.md` axis D
- `1.vision.experience.case=_.md` rows 646, 650, 640, 631; cross-repo table removed; case=8 moved to `archive/`
- `1.vision.experience.case=0.*.md`, `case=4.*.md`
- `1.vision.yield.md`
- `.fulcrums/` F7, F8, F11, F21, F25, F29 verdicts; F33
