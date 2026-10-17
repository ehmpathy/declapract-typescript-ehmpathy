# release.comments — drafts for the issues this release does not close by commit

the D1 issues close by the release commit (`closes #N` per issue). the 18 below need a hand-posted
comment. #684 and #664 close by commit and also take a note, below. `<release>` = the version tag
this round publishes; fill it at release.

post with: `gh issue comment <n> --repo ehmpathy/declapract-typescript-ehmpathy --body-file <file>`,
then `gh issue close <n>` for the D0 set. the D2 set stays open.

## .D0 — close, with the commit that fixed it

| # | comment |
|---|---------|
| 613 | fixed in d372808 (#614), shipped in v0.49.13: the jsdoc no longer closes itself, and a template-parse clamp holds the class. closes. |
| 599 | fixed in 551d342 (#559), shipped in v0.49.10: every action is pinned to a full SHA, held by the actionPins clamp. `<release>` adds a weekly pin bump (#556). closes. |
| 575 | fixed in b8d4803 (#605): the `inert-build-allowlist` bad-practice removes the v11 `allowBuilds:` under the pnpm 10 pin. closes. |
| 524 | fixed in eaf6b26 (#526): `learner` is in the `prepare:rhachet` roles. closes. |
| 518 | fixed in eaf6b26 (#526) and 84bcee7 (#533): the `rhachet*` depcheck ignore covers rhachet-roles-ghlitch. closes. |
| 492 | fixed in eaf6b26 (#526): rhachet-roles-ghlitch ships with operator, observer and deployer in every usecase. closes. |
| 490 | fixed in b8d4803 (#605): `useKeyrack` lives in tests-node. the `use.testdb` half belongs to rhachet-roles-ghlitch. closes. |
| 584 | fixed in b8d4803 (#605): tests-expo gates on the jest-expo major. closes. |
| 546 | fixed in b8d4803 (#605): the domain-objects floor is 0.34.0. closes. |

## .D2 — hold open, with what it waits on

| # | comment |
|---|---------|
| 603 | held: the expo acceptance practice absorbs the shape ahbode/app-protools-native ships, once that work lands. no change in `<release>`. |
| 604 | held, with #603: lands with the expo acceptance practice once ahbode/app-protools-native ships its latest work. |
| 617 | held, with #603: runner detection ships together with the acceptance practice it detects. |
| 677 | held, with #603: the sharded play job lands in an expo-owned workflow, with the acceptance practice it runs and the `@playwright/test` floor that work sets. |
| 682 | held on ahbode/svc-service-providers#68: the pool lifts into the practice once that module-scope pave ships, keyed per connection mode (#673). |
| 582 | held: a practice cannot untrack a file, so this needs a declapract core report of tracked files that a declared ignore covers. `<release>` cuts the stale prose in `.gitignore.declapract.ts`. |
| 557 | held for a later round: the rename to `declapracts-by-ehmpathy` is a planned future todo. `<release>` keeps the current package name. |
| 513 | held: no practice ships `git.release`; the `--from main` failfast belongs to rhachet-roles-ehmpathy's mechanic skill. |
| 567 | held: a deny on clone writes to `.husky/**` belongs in rhachet-roles-ehmpathy's hooks (a settings deny here would add a second owner and miss the `*safe` skills). `<release>` adds `check.timestamps.lock.sh`, which halts any commit while the timestamp hook differs from the practice — a tamper guard for that one hook. |

## .#684 — closes with `<release>`, no exemption

> `<release>` does not exempt `.goals/`. the timestamp hook blocks every timestamp in every tracked
> file, by design, with zero exceptions: a timestamp is a privacy leak. a new
> `check.timestamps.lock.sh` halts any commit while the hook differs from the
> practice. the deadlock this reported is real; its fix is for the ask log's writer to mask clocks
> before it appends, which belongs to the repo that ships the achiever role.

## .#664 — closes with `<release>`; item 6 belongs to the cutover owner

> `<release>` lands items 1–5: the testdb pin as a check, `dialect: 17`, a healthcheck on the
> repo's own db, client timeouts, and the engine-skew check. item 6, the after-upgrade
> `ALTER EXTENSION … UPDATE` and `ANALYZE`, does not ship in persist-with-rds: the major-version
> cutover is performed by ahbode/infrastructure, which already owns and runs its post-upgrade ops.
> a service consumes the upgraded cluster; it does not operate the upgrade.
