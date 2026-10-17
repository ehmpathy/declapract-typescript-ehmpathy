# inventory.of=fulcrums

| case | title | rework | status | confidence |
|------|-------|--------|--------|------------|
| F1 | the D1/D2 line: perf + feature asks (#622, #623, #652) deferred | clean | overruled (S2): land them | — |
| F2 | #645: skip off ci, strict in ci — over a declared-binary check | clean | overruled (S1): remove terraform fmt | — |
| F3 | #633: fix the doc, not the signature | clean | best-guess | 70% |
| F4 | #626: flag the input→context migration; no rewrite, no delete | clean | best-guess (revised under S2) | 75% |
| F5 | #638 held as a decision: a new required variable breaks `plan` for adopters | clean | overruled (S2): land it | — |
| F6 | #630: one owner per multi-declared file | clean | best-guess | 80% |
| F7 | #646: floor at 0.7.1 (now published) | clean | best-guess (S6: 0.7.1 published upstream) | 80% |
| F8 | #631: bind the ancient payload struct at the practice, not in the sdk | clean | best-guess (S6: unheld; one cast until sdk-aws-lambda#42) | 75% |
| F9 | #635: detect + mark the vendored fork in `logs`; no rewrite | clean | best-guess | 60% |
| F10 | #611/#612: bar imds in useKeyrack, strict mode only under aws auth | clean | best-guess | 60% |
| F11 | #651: a local cloud acceptance run with no ACCESS throws | clean | best-guess (upstream half → dream, S5) | 70% |
| F12 | #622: `build:ifstale` owned by tests-any, stamp-based | clean | best-guess | 65% |
| F13 | #617: runner detected by config prefix; jest checks carve out playwright | clean | held (S3) | — |
| F14 | #621: expo prepare wakes livedb via-gateway | clean | best-guess | 55% |
| F15 | #603/#604: one acceptance concept, two runners, homed in tests-expo | dirty | held (S3) | — |
| F16 | #608: expo `provision.yml` via a merge-by-job fix, not EQUALS | clean | best-guess | 65% |
| F17 | #610: print the contention set to stderr at the flip | clean | best-guess | 70% |
| F18 | #600: pin terraform 1.9.8 | clean | best-guess | 55% |
| F19 | #645: the terraform-formatter bad-practice lives in `format` | clean | best-guess | 75% |
| F20 | #648: drop `private`, keep `requireLinearHistory: false` | clean | best-guess | 75% |
| F21 | #652: ship the us-east-1 CA bundle; other regions fail loud | clean | best-guess (upstream half → dream, S5) | 65% |
| F22 | #638: derive the cluster name; override variable is optional | clean | best-guess | 80% |
| F23 | #637: ship the derived param form now | dirty | best-guess; IAM risk removed (S4) | 80% |
| F24 | #634: `.contract()` rewrite homed in `domain`, never emits `.ref()` | clean | half ruled (S19) | 70% |
| F25 | #625: floors plus an unfloored-member bad-practice | clean | best-guess (upstream half → dream, S5) | 75% |
| F26 | #624: an override-undercuts bad-practice over a declarative override key | clean | best-guess | 75% |
| F27 | #629: `z.guid()`, backfill only in marker-carrier files | clean | best-guess | 65% |
| F28 | #601/#616/#628: node + `yaml` replace `yq`; `.dpdmrc.yaml` gets a check that keeps adopter entries | clean | best-guess | 75% |
| F29 | #607: this repo removes the conflicts; the leftover report is a dream, not a filed issue | clean | best-guess (S5) | 80% |
| F30 | #620: also drop the stray `echo`; leave `start:*:dev*` alone | clean | best-guess | 80% |
| F31 | #619: no consumer env code; `build:web` defaults ACCESS to prep | clean | best-guess | 65% |
| F32 | #609: land the depcheck ignore; not part of the held playwright work | clean | best-guess | 70% |
| F33 | the lambda cluster (#646, #650, #640, #631) held on sdk-aws-lambda 0.7.1 | clean | hold lifted (S6: 0.7.1 published) | — |
| F34 | #658: config yields `config.schema.ts` to persist-with-rds via a superset check | clean | best-guess | 80% |
| F35 | #654: the joi fixer pins zod 4.4.3 exact (sdk-aws-lambda's pin) | clean | best-guess | 70% |
| F36 | #657: drop only a declared dev-only tool from `dependencies` | clean | best-guess | 75% |
| F37 | #664: the testdb pg pin as a check, no fleet-wide bump | clean | best-guess | 65% |
| F38 | #664: the version-skew job lands and fails loud with its IAM grant named | clean | best-guess | 55% |
| F39 | #650/#666: no apiGateway acceptance call pins `struct: { payload: 'ancient' }`; at the 0.7.2 floor (sdk-aws-lambda#51) the 400 reads move to the nested body in the same pass, http reads stay flat, a mixed file is marked | clean | ruled: pin retired, it never released | 95% |
| F40 | #659: delete the retired template only on a body match | clean | best-guess | 80% |
| F41 | #661: delete `Config.ts` and repoint imports; a schema gap turns tsc red, loud | clean | best-guess | 60% |
| F42 | #663: keep `bottleneck` while src imports it | clean | best-guess | 80% |
| F43 | #669: the evaluation job is always present, gated on a presence step | clean | best-guess | 75% |
| F44 | #670: retire only patches keyed below the 0.7.1 floor | clean | best-guess | 80% |
| F45 | #653: the template speaks `ACCESS`, not the adopter's `STAGE` | clean | best-guess | 80% |
| F46 | #671: the check covers exactly the specifiers the fix can rewrite | clean | best-guess | 70% |
| F47 | #672: drop `npx` only where the practice declares the bin | clean | best-guess | 85% |
| F48 | #673: readonly mode is a session guard, not a boundary; default `readwrite` | clean | best-guess | 75% |
| F49 | #674: a per-worktree testdb via an override in code; `7821` stays the ci default | clean | best-guess | 55% |
| F50 | #675: CONFIG/ACCESS alignment lives in the acceptance env file | clean | best-guess | 65% |
| F51 | #676/#618: a metro cache keyed on ACCESS + app config replaces `build:web --clear` | clean | best-guess | 70% |
| F52 | #677: held with the playwright work (S3), not split into a standalone job now | clean | best-guess | 80% |
| F53 | #678: no new `test:build` job; a clamp proves every pr workflow builds, and the issue closes on it | clean | best-guess | 75% |
| F54 | #679: rename to `._.{acpt,intg,unit,eval}` at org scale, with both suffix forms matched through the transition | dirty | ruled (S11): accept both forms, rename none | — |
| F55 | #680: take `allowUnusedPatches` only; `ignorePatchFailures` is a failhide | clean | ruled (S10): both keys, warn never block | — |
| F56 | #680: a stale patch is retired by a fix (lockfile-resolved version); a failed patch only warns | clean | best-guess | 70% |
| F57 | #682: hold the pg pool until ahbode/svc-service-providers#68 ships | clean | best-guess | 85% |
| F58 | #683: prep's password leaves accept either value; the fix keeps an extant password | clean | best-guess | 65% |
| F59 | #685: a merge-by-job fix for provision.yml; never strip an undeclared job | clean | best-guess | 75% |
| F60 | #686: the role-rename copy is prose + a `removed{}` marker, targets = #637's derived names | clean | best-guess | 85% |
| F61 | #687: a wide `paths:` gate, shipped with #685's fix fn | clean | ruled against (S18) | 70% |
| F62 | #689: `not:` + rhachet floor 1.49.2; the 5000-token budget seed becomes a findsert of the adopter's own value | clean | best-guess | 55% |
| F63 | #681/#641: one halt message — "timestamps are forbidden in tracked files" | clean | best-guess | 75% |
| F64 | #585: a provider-key preflight job in the `.test.yml` template | clean | ruled against (S18) | 70% |
| F65 | #556: this repo's own scheduled SHA-pin bump, not dependabot | clean | best-guess | 70% |
| F66 | #553: a handler load check on the deploy runtime, as a pre-deploy gate, not full acceptance | clean | best-guess | 60% |
| F67 | #552: the serverless runtime reads the consumer's `.nvmrc` | clean | best-guess | 75% |
| F68 | #550 part 3: the secrets brief lives in the mechanic role (dream) | clean | best-guess | 70% |
| F69 | #582: hold on a declapract core report; cut the stale prose now | clean | best-guess | 70% |
| F70 | #558: land a `rhachet-roles-package` usecase now | clean | best-guess | 65% |
| F71 | #540: CRLF in, LF out; a comment binds to the line below it | clean | best-guess | 70% |
| F72 | #520: keep `npm run build &&` before `rhachet init` where a `link:.` self-dep exists | clean | best-guess | 75% |
| F73 | #514: a hand-rolled `check.secrets.sh`, not gitleaks | clean | best-guess | 80% |
| F74 | #512: `ignorePatterns` gains `.agent/repo=*` with a `!.agent/repo=.this` negation | clean | best-guess | 80% |
| F75 | #491/#487: the rhachet keyrack.yml becomes a usecase-aware findsert with AWS_PROFILE | clean | best-guess | 75% |
| F76 | #548: a `z.coerce.number()` bullet on the extant joi→zod marker | clean | best-guess | 65% |
| F77 | #545: `pnpm.overrides.zod` = 4.4.3, one constant with #654 | clean | best-guess | 65% |
| F78 | #544: a marker-stamp bad-practice on explicit param paths, never a fixless check | clean | best-guess | 60% |
| F79 | #532: a marker on hand-written lambda clients that names `npx sdk-aws-lambda gen` | clean | best-guess | 70% |
| F80 | #530: template to `exid:` + a bad-practice over change entries | clean | best-guess | 85% |
| F81 | #517: append ES2023 to an extant tsconfig `lib` | clean | best-guess | 75% |
| F82 | #584: D0 on the jest-expo gate; the jest major stays ungated (S3) | clean | best-guess | 75% |
| F83 | #557: the rename is a future todo; this round keeps the current package name | clean | ruled (S15) | — |
| F84 | #567: the `.husky/**` write-deny lives in the mechanic hooks (dream) | clean | best-guess | 80% |
| F85 | #519: closes via #638 plus a distinct-port clamp | clean | best-guess | 80% |
| F86 | #541: #630's clamp enumerates every gitignore declarer | clean | best-guess | 80% |
| F87 | #536: #607's sweep also asserts fix(fix(x)) === fix(x) | clean | best-guess | 85% |
| F88 | the template type-check clamp: per usecase, apply + install + `tsc --noEmit` in a temp repo | clean | best-guess | 70% |
| F89 | #684: no exemption to the timestamp hook, ever; a lock hook pins it by git blob id | clean | ruled (S16) | — |
| F90 | #685/#687: the provision.yml merge owns each declared trigger whole; undeclared triggers kept | clean | best-guess | 75% |
| F91 | #630 follow-up: the moment bad-practice detects at src imports, not package.json | clean | best-guess | 75% |
| F92 | F88/expo: an ambient `test-fns.autoprune.d.ts`, not a moduleResolution switch or expo 54 floor | clean | best-guess | 80% |
| F93 | #544: the unmigrated-param-paths marker is a top-level JSON key `@declapract:review` | clean | best-guess | 70% |
| F94 | #638: `test.json` keeps the tunnel bastion/cluster on the shared variable, for one key set | clean | best-guess | 75% |
| F95 | #607: `jest.unit.env.ts` + `init.yml` stay CONTAINS with no fix, allowlisted with a reason | clean | best-guess | 70% |
| F96 | the fix-coverage harness's null-only bad-practice gap is dreamed, not closed; touched fixes get per-file twice-applied tests | dirty | best-guess | 80% |
| F97 | round i002: a concern the code or a clamp already answers is disputed with that evidence, not fixed | clean | ruled: 37 of 38 i004 disputes stand; r010 b5 overruled + repaired | 75% |
| F98 | 5.3: `mech-test-scope-purity` left whole (~49% measured); the other three test-only lanes split (~64%) | clean | best-guess | 75% |
| F99 | 5.3: `lint-react-native`'s dead `eslint-plugin-react-native` dep is dreamed; only its `.eslintrc.js` (which broke convergence) is retired | dirty | best-guess | 80% |
| F100 | 5.3: absent-file plan messages name what to author; the `serverless.yml` row and the fixture-row noise are dreamed | dirty | best-guess | 75% |
| F101 | 5.3 peer: the `repo-rules-slice-am` template-self-close blocker is disputed; the report retracts it in its own body, and the cited file is a declaration, never emitted | clean | best-guess | 97% |
| F102 | 5.3 peer: the 7 `mech-test-intent` blockers are disputed; each changed expectation traces to the issue that required it (#650, #679, #689, #683, D55, the parameters rename) | clean | best-guess | 90% |
| F103 | 5.3 peer: the 27 approved-lane nitpicks are disputed, each with its evidence (most self-retracted in their own report) | clean | best-guess | 85% |
| F104 | the repo boot.yml holds its 5,000 cap: the say set keeps check-semantics, default-check-equals, entool-requests and the timestamp rule; the overview and five practice-author rules boot as ref (adopted from a foreman edit) | clean | best-guess | 80% |
| F105 | #664 item 6: `after_major_upgrade.sql` is dropped; the post-upgrade ops belong to ahbode/infrastructure, which performs the cutover | clean | ruled (b) by the wisher | 95% |
| F106 | the testdb port override the jest env declares is honored only with test access | clean | ruled (b), test access, by the wisher | 95% |
| F107 | #664 item 5: `check-engine-skew.sh` stays — a consumer validation of the repo's own testdb pin, not copium | clean | best-guess | 75% |
| F108 | the shipped tests-node test utils (`src/.test/*.ts`, root `jest.integration.env.db.ts`) stay put; their move to `src/.test/assets/` owes a migration, caught as a dream | dirty | best-guess | 70% |
| F109 | provision-github visibility fails closed: public only by an explicit `"private": false`; an extant public repo that omits it goes private on next apply | clean | ruled (b) by the wisher | 95% |
| F110 | backfill `"private": true` wherever package.json `private` is not an explicit boolean; a published npm-package adopter (this repo included) then needs `"private": false` to publish | clean | ruled (a) by the wisher; insert slot + this repo's own opt-in open | 90% |
| F111 | outside jest, under test access in a linked worktree, the app dials the declared testdb port unless `TESTDB_PORT` is exported; the provisioner and `compose.sh` still derive it | clean | best-guess | 80% |
| F112 | the raw `@declapract{check.minVersion(...)}` an absent dep gets after one apply is declapract's CONTAINS json fix; reseeded (extant 10-14 dream), not coped with in provision-github | clean | best-guess | 90% |
| F113 | F92's stand-in moves to `best-practice/src/.test/assets/`, reached by a triple-slash reference from each `jest.*.prepare.ts`; kept until test-fns ships `typesVersions` | clean | keep ruled (S25); home best-guess | 85% |