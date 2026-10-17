# research — the open reports filed before the round's window (#487–#599)

seed S13 widened the round to every open upgrade report. 40 issues opened before 2026-09-15 were
still open on 2026-10-14. three read-only sweeps verdicted them against the current tree; the
per-issue evidence (file:line, commit, fix sketch) lives in the batch files:

- `research.open-before-window.batch-a.md` — cicd, runtime, security: 599 585 556 553 552 551 550 523 516 513 571
- `research.open-before-window.batch-b.md` — rhachet, git, lint, keyrack, husky, pnpm: 582 575 567 558 557 541 540 536 524 520 518 514 512 492 491 490 487
- `research.open-before-window.batch-c.md` — fixers, rds config, jest, sdk: 584 565 562 548 546 545 544 539 532 530 519 517

no commit message names any of the 40; each D0 cites the commit a `git log -S` found.

## .the dispositions (40)

| disposition | count | issues |
|-------------|-------|--------|
| D1 new fix this round | 18 | 585, 556, 553, 552, 550 (part 2), 516 (footer), 558, 540, 520, 514 (secret scan), 491 + 487 (one fix), 548, 545 (residual), 544 (marker), 532, 530, 517 |
| D1 via a planned #6xx row | 10 | 551 (dup → 552 + 553), 523 (→ 638), 571 (→ 685, 629, 654, 661, 642, 662), 541 (→ 630), 536 (→ 607), 512 (→ 639), 565 (→ 634), 562 (→ 638), 539 (→ 638, 637), 519 (→ 638) |
| D0 fixed before | 8 | 599 (551d342), 575 (b8d4803), 524 (eaf6b26), 518 (eaf6b26 + 84bcee7), 492 (eaf6b26), 490 (b8d4803), 584 (b8d4803), 546 (b8d4803) |
| D2 held on outside work | 4 | 582 (declapract core report), 557 (the human's rename + npm claim), 513 (rhachet-roles-ehmpathy `git.release`), 567 (rhachet-roles-ehmpathy hook) |

partial halves that ride with a disposition above: 514's `.cache/` ignore is D0 (85646f0); 550
part 1 is D0 (551d342) and part 3 is a dream; 516's body rule is D0 (b8d4803); 544's auto-migrate
half waits on ghlitch#129; 571's meta-check waits on declapract#107; 582 cuts stale prose at
`git/best-practice/.gitignore.declapract.ts:16-17` this round.

## .the findings that change the plan

- **#516 footer is crit.** `commitlint.config.js:9` sets the body rule only; config-conventional's
  error-level footer limit of 100 still fails every pr whose squash body lands in the footer.
- **#520 is a fix-breaks.** the rhachet `package.json` CONTAINS fix strips a hand-added
  `npm run build &&` before `rhachet init` (F72).
- **#491/#487 need no new rhachet.** `is-optional-if-has` reads in rhachet 1.48.0.
- **#544 and #532 avoid a fixless check.** a check with no fix marks the file manual and blocks
  `apply` (#607's gate), so both stamp a review marker instead (F78, F79).
- **#545's residual** — repos already on zod, never through the joi fixer — keep any 4.x beside
  sdk-aws-lambda's exact 4.4.3 (F77).

## .fulcrums

F64–F87, one per call under ~93% confidence (`.fulcrums/`).
