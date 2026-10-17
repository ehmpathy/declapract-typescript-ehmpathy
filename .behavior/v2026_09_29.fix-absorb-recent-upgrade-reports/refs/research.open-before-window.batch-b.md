# research — open issues created before the window, batch b

17 open issues: #582 575 567 558 557 541 540 536 524 520 518 514 512 492 491 490 487.
each was read via `gh issue view <n> --json title,body,comments,state` (none has a comment).
the evidence is first-hand (file:line, `git log -S`). no issue body cites a commit by `#N`:
`git log --grep` finds no match for any of the 17, so each D0 cites the commit that carries the
fix, located with `-S`.

## summary

| # | short title | disposition | class / delivery / care | fulcrum (<93%) |
|---|-------------|-------------|-------------------------|----------------|
| 582 | declared gitignore line is inert for a tracked file | D2 (ehmpathy/declapract: repo-level fix seam) + D1 prose cut (stale lines 16-17) | B3 / C3 / alt | 70%. alt: D1 as a report-only bad-practice with no fix (returns the FIX_MANUAL gate #607 removes) |
| 575 | pnpm `allowBuilds` block inert under v10 pin | D0, b8d4803 (#605) | — | 90%. the block is deleted, not rekeyed. the delete subsumes ask 3 (non-boolean values) |
| 567 | forbid clone writes to `.husky/**` | other-repo: rhachet-roles-ehmpathy (mechanic PreToolUse hook) | B7 / — / alt | 80%. alt: in-repo `.claude/settings.json` deny. a second owner for a rhachet-init file, and it misses the `*safe` skills |
| 558 | usecase for `rhachet-roles-*` repos | D1 (new) | B7 / C1 / alt | 70% in scope. alt: D2 that waits on the wisher's call on name + shape. name `rhachet-roles-package` 65% |
| 557 | rename to `declapracts-by-ehmpathy` | D2 (human: gh repo rename + npm name; consumers in other repos) | B7 / — / alt | 80%. alt: D1 rename of package.json + references now, gh rename after. dirty if the order slips |
| 541 | guard: a gitignore declarer must use the shared util | D1-via-#630 (multi-declarer clamp) | B4 / C1 (test) / alt | 80%. alt: a standalone enumerate-and-import test beside #630's clamp |
| 540 | gitignore line model: CRLF, comments, tail signal | D1 (new) | B2 / C2 (shared util) / alt | 75% emit LF. 70% a comment binds to the line below it. alt: keep each comment in place, unsorted |
| 536 | prove idempotency for every `.declapract.ts` fix | D1-via-#607 (sweep test, widened) | B4 / C1 (test) / alt | 85%. #607's sweep gains `fix(fix(x))===fix(x)` beside `check(fix(x))` |
| 524 | learner role in standard roles | D0, eaf6b26 (#526) | — | 95% |
| 520 | self-dep repos build before `rhachet init` | D1 (new) | B1 / C2 (rhachet package.json check/fix) / alt | 75% to key on a `link:.` self-dep. alt: own it in #558's usecase |
| 518 | ghlitch absent from the depcheck ignore list | D0, eaf6b26 (#526), then the `rhachet*` glob in 84bcee7 (#533) | — | 95% |
| 514 | `.cache/` gitignore + husky secret scan | half D0 (`.cache/` 85646f0, #435). the secret scan is D1 | B7 / C1 / alt | 80%: a hand-rolled `check.secrets.sh`. alt: gitleaks, a host binary the org has removed elsewhere |
| 512 | depcheck: ignore vendored `.agent/repo=<other>/` | D1-via-#639 (widen `ignorePatterns`). the symptom is already D0 via 84bcee7 (#533) | B5 / C2 / alt | 80% that gitignore-style negation works in depcheck's `ignorePatterns` |
| 492 | ghlitch + operator/deployer/observer for aws repos | D0, eaf6b26 (#526) | — | 85%. it ships to every usecase, wider than asked. role keyracks reach via `rhachet init --keys` |
| 491 | keyrack: AWS_PROFILE `is-optional-if-has` | D1 (new), one fix with #487 | B5 / C2 / alt | 75%. the rhachet keyrack declaration becomes a usecase-aware findsert. alt: a new declarer in environments-aws |
| 490 | useKeyrack for aws-dependent services | D0, b8d4803 (#605). the use.testdb half belongs to ghlitch | — | 85% |
| 487 | AWS_PROFILE in env.all for node-services | D1 (new), one fix with #491 | B5 / C2 / alt | 75% (same as #491) |

tally: D0 6 (575, 524, 518, 490, 492, plus #514's first half) · D1 new 6 (558, 540, 520, 514 rest,
491+487 as one fix) · D1-via-#6xx 3 (541→#630, 536→#607, 512→#639) · D2 2 (582 core, 557) ·
other-repo 1 (567).

---

## #582 — a declared `.gitignore` line is inert for an already-tracked file

- **kind:** practice report for this repo, but its cure needs ehmpathy/declapract.
- **state:** the doc-comment ask (3) has landed: `git/best-practice/.gitignore.declapract.ts:34-40`
  states the untracked-only scope and names #582 as the follow-on. there is no
  `src/practices/git/bad-practices/` dir. no #6xx row covers it.
  (#667 and #688 add ignore lines. neither touches the index.)
- **stale prose, same file:** lines 16-17 say *"`app-react-native-expo` takes `git` WITHOUT
  `rhachet`"*. that is false. `src/useCases.yml:30` puts `rhachet` in `typescript-project-core`,
  and `:85-87` shows expo extends core. the rationale of the `.agent/.cache/` line rests on that
  claim. B6, C1, a cut in-round.
- **class:** B3 (a declared line reads as enforcement and enforces none). delivery: C3. care: alt.
- **why the cure is not in this repo:** a declapract `fix` returns contents for ONE file. it has
  no seam to the git index, so `git rm --cached` cannot be expressed. the two in-repo shapes
  both fail:
  - a report-only bad-practice (its check shells `git ls-files -ci --exclude-standard`, with no
    fix) leaves a FIX_MANUAL leftover on every affected consumer. that is the exact poison #607
    removes from the core.
  - a bad-practice on the tracked path whose fix returns `{ contents: null }` deletes the adopter's
    local file from disk, not just from the index. that is destructive.
- **disposition:** D2. the hold names `ehmpathy/declapract`: a repo-level fix seam (or a leftover
  report, adjacent to the caught dream `v2026_09_29.reseed.declapract-apply-leftover-report.md`).
  the prose cut at lines 16-17 lands this round (D1).
- **fulcrum (70%):** alternative = D1 with a report-only check that skips on a non-git dir. it
  accepts a FIX_MANUAL leftover. clean rework: a deletion.

## #575 — pnpm build allowlist inert (placeholder values + v11 key under v10 pin)

- **kind:** practice report, this repo.
- **state:** D0. `pnpm/bad-practices/inert-build-allowlist/pnpm-workspace.yaml.declapract.ts` was
  added in b8d4803 (#605) and shipped in v0.49.12. it detects any `allowBuilds:` block and strips
  it, or deletes the file when the block is the file's sole content. its docblock (`:9`) names
  #575. the pnpm pin is `pnpm@10.34.5` (`pnpm/best-practice/package.json`).
- ask 1 (emit the key that matches the major): moot, since declapract emits no allowlist (`:10-13`).
  ask 2 (no placeholder): the inert block, placeholders and all, is deleted. ask 3 (flag a
  non-boolean value): subsumed, since any `allowBuilds:` block is flagged.
- residual nit, not this issue: the tests-expo snapshot still shows `pnpm@10.32.1`.
- **fulcrum (90%):** that delete, rather than a rekey to `onlyBuiltDependencies`, satisfies the
  reporter.

## #567 — forbid clone writes to `.husky/**`

- **kind:** another-repo act.
- **state:** no `.husky/**` deny exists in any practice. the rhachet practice declares no
  `.claude/settings.json` and no deny list. the files it declares are `package.json`, `boot.yml`,
  the `.agent/keyrack.yml` EXISTS check, and `.gitignore`. `rhachet init --hooks` writes the
  settings file. the `pretooluse.forbid-tmp-writes` peer the issue cites is a mechanic hook from
  rhachet-roles-ehmpathy (`.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/`).
- **class:** B7. care: alt.
- **disposition:** other-repo: **rhachet-roles-ehmpathy**. it needs a mechanic PreToolUse hook that
  refuses Write/Edit and the `*safe` mutators (sedreplace, teesafe, mvsafe, rmsafe, cpsafe) on
  `.husky/**`, with the named-fix message from the issue. reads stay allowed. per S5: a caught dream,
  and the issue held (D2) with a comment that names that repo.
- **fulcrum (80%):** alternative = an in-repo findsert of `permissions.deny` (`Write(.husky/**)`,
  `Edit(.husky/**)`) into `.claude/settings.json`. it makes a second owner for a file rhachet init
  owns (#630's one-owner rule), its message is generic, and it does not see the shell skills.

## #558 — declare a usecase for `rhachet-roles-*` repos

- **kind:** practice feature, this repo. it needs a read-only audit of the role repos (reads are
  not work in another repo).
- **state:** open. `src/useCases.yml` has no role-repo usecase. its kinds are core, typescript-project,
  npm-package, the lambda-service family, and app-react-native-expo. no #6xx row covers it.
- **class:** B7. delivery: C1 (a new useCases.yml entry + a new practice for role-repo shapes).
  care: alt.
- **fix sketch:**
  - audit the role repos with `rhx git.repo.get` (seed list in the issue). record what was surveyed.
  - add `rhachet-roles-package` with `extends: [typescript-project-core, typescript-project,
    npm-package]` (core is listed directly per declapract#17).
  - add a `rhachet-roles` practice for the shapes the audit finds: the `link:.` self-dep, #520's
    build-before-init, and the per-role `readme.md`/`boot.yml`/`keyrack.yml` EXISTS checks.
  - add a characterization row in the `getAllPracticesForUsecase` test.
- **disposition:** D1 (S2: no deferral for size).
- **fulcrum (70%):** in scope this round. alternative = D2, which waits on the wisher's call on the
  shape: the issue's audit acceptance is a judgment, and two peers downstream depend on it. the
  name `rhachet-roles-package` is 65%. alternative = `rhachet-roles`. a clean rename while no
  consumer uses it.

## #557 — rename repo + package to `declapracts-by-ehmpathy`

- **kind:** mostly a human/other-repo act.
- **state:** open. the name in package.json, the readme, and the fixture `declapract.use.yml` files
  is `declapract-typescript-ehmpathy`. no #6xx row covers it.
- **class:** B7. care: alt.
- **what blocks in-repo work:**
  - the github repo rename needs an admin (the human)
  - npm publish under a new name needs that name claimed by the org's npm account
  - every consumer's `declarations: npm:<name>` lives in other repos (S5)
  - a deprecate/alias of the old package is a publish act on the old name
- **disposition:** D2. the hold names the human's rename of the gh repo, the npm name claim, and
  the consumer migration across other repos. the in-repo string sweep (package.json `name`,
  readme, fixtures, plus a deprecation notice) follows that rename in one commit.
- **fulcrum (80%):** alternative = D1 now, with package.json + references renamed so release-please
  publishes the new name. dirty if the gh rename or npm claim lags: two live names, and consumers
  frozen on the old one with no signal.

## #541 — stop a new gitignore declarer from a re-derived algorithm

- **kind:** practice guard, this repo.
- **state:** open. cf90caa (#542) routed the three declarers (git, rhachet,
  cicd-app-react-native-expo) through `src/utils/defineExpectedGitignoreContents.ts`. no test
  enumerates `*.gitignore.declapract.ts`, and `:58-59` of the util admits no durable guard.
- **overlap:** #630's multi-declarer clamp (`refs/research.cicd.md:20`) walks every practice per
  usecase and allowlists `.gitignore` as a by-design multi-declared path. that allowlist row is the
  exact place to assert the guard.
- **class:** B4 (unguarded drift to non-convergence). delivery: C1 (test). care: alt.
- **fix sketch:** in #630's clamp, a multi-declared `.gitignore` passes only when EVERY declarer's
  `.declapract.ts` imports `defineExpectedGitignoreContents` and declares no `ignoresOrdered`
  literal. show it bites: a throwaway declarer that re-derives the tail turns it red.
- **disposition:** D1-via-#630.
- **fulcrum (80%):** alternative = a standalone test beside the util. same cost, but a second
  enumeration of declarers to keep in sync.

## #540 — the gitignore line model is thinner than the file format

- **kind:** practice defect, this repo.
- **state:** open. `defineExpectedGitignoreContents.ts:66` splits on `'\n'` only, with no `\r` strip.
  comments are sorted as patterns (`:75-80`). blanks are dropped. no #6xx row covers it.
- **class:** B2 (on CRLF input the fix emits a hoisted, inert negation; on any input it detaches a
  comment). delivery: C2 (the shared util, so all three declarers move as one). care: alt (CRLF is
  rare on the org's linux/mac boxes, and the tail still parses on LF).
- **fix sketch:**
  1. strip a terminal `\r` per parsed line, before the ordered-pattern test. emit LF.
  2. a comment binds to the next non-comment line and sorts as a unit, keyed on that line. a
     final comment with no successor stays at the end of the sortable block.
  3. once (2) holds: the shared ordered tail opens with a `#` comment that says its order carries
     load. the tail is shared, so convergence holds.
  - clamps: a CRLF fixture (unit + executeApply) red before / green after, plus a twice-applied
    fixed point. a comment-above-pattern fixture asserts adjacency after the fix.
  - the current test at `git/best-practice/.gitignore.declapract.test.ts:80` gains the comment
    assertion.
- **disposition:** D1.
- **fulcrums:**
  - emit LF (75%). alternative: preserve the input's EOL. clean rework.
  - comment binds to its successor (70%). alternative: comments keep their original index,
    unsorted. clean rework within the util.

## #536 — prove idempotency for every `.declapract.ts` fix

- **kind:** practice test sweep, this repo.
- **overlap:** #607's row lands *"a check(fix(x)) test over every declaration"*, plus the
  twice-apply convergence test via executeApply on rds + expo fixtures (`refs/research.cicd.md:24`).
  that is clause 2 of the issue, plus pipeline-grain coverage of clause 1.
  the yield contract (`1.vision.yield.md:61-62`) also requires a twice-applied case for every fix
  fn this round touches.
- **residual:** a per-declaration `fix(fix(x)) === fix(x)` assertion in the same sweep, with
  `fix(null, …)` as one input (the self-referential-fixture trap the issue names).
- **class:** B4. delivery: C1 (test). care: alt.
- **disposition:** D1-via-#607 (widen the sweep with the fixed-point clause).
- **fulcrum (85%):** that one generic sweep test meets "for each" without a hand-written case per
  file. alternative: per-file cases, much larger.

## #524 — include the learner role in the standard rhachet roles

- **state:** D0, eaf6b26 (#526): *"default rhachet roles now include learner, …"*. today
  `rhachet/best-practice/package.json:15` has `learner` in `prepare:rhachet`, and
  `rhachet-roles-bhrain` floors at 0.34.1 (≥ 0.29.21, where memory.guard shipped).
- **disposition:** D0. close with eaf6b26.

## #520 — rhachet self-dep repos must build before `rhachet init`

- **kind:** practice report, this repo.
- **state:** open. `rhachet/best-practice/package.json:15` declares `prepare:rhachet` as
  `rhachet init …`, with no build. its declaration is CONTAINS
  (`package.json.declapract.ts:3`). so a self-linked repo that prepends `npm run build && ` FAILS
  the check, and its fix rewrites the build away. the practice not only omits the fix, it would
  undo a hand repair (a latent B4). `node/bad-practices/self-deps-not-link` only fixes non-`link:.`
  self deps.
- **class:** B1 (emits a prepare that breaks every self-linked role repo at role boot). delivery: C2.
  care: alt (role repos only, though crit for them).
- **fix sketch:**
  - turn the rhachet `package.json` declaration into a check/fix pair. when the consumer's
    `package.json` declares its own name as `link:.` (read via `getProjectRootDirectory`), the
    expected `prepare:rhachet` is `npm run build && rhachet init …`. otherwise it is the plain
    value.
  - the fix merges only that key. both forms pass on a matched repo.
  - clamps: a self-linked fixture red before, green after, twice-applied. a plain repo is
    unchanged.
- **disposition:** D1. it pairs with #558. if #558's usecase lands, it may own this instead.
- **fulcrum (75%):** detection keyed on a `link:.` self-dep (the issue's own detect rule).
  alternative = key on #558's usecase. clean move.

## #518 — rhachet-roles-ghlitch absent from the depcheck ignore list

- **state:** D0. eaf6b26 (#526) added `rhachet-roles-ghlitch` (plus bhrowser, rhachet) to the depcheck
  ignores and put `operator observer deployer` in `prepare:rhachet`. 84bcee7 (#533) later replaced
  the per-package list with `"rhachet*"` (`lint/best-practice/.depcheckrc.yml:4-5`).
- **disposition:** D0. close with eaf6b26 + 84bcee7.

## #514 — guard against committed secrets and cache artifacts

- **ask 1 (`.cache/` ignored):** D0, 85646f0 (#435). `git/best-practice/.gitignore.declapract.ts:47`.
- **ask 2 (husky secret scan):** open. `.husky/pre-commit` sources only `check.yalc.sh` and
  `check.timestamps.sh`. no #6xx row covers it.
  - class: B7. delivery: C1 (husky EQUALS: a new `.husky/check.secrets.sh` + one source line in
    `pre-commit`). care: alt.
  - fix sketch:
    - scan the staged diff (`git diff --cached -U0`, added lines only) for `[A-Z_]*(API_KEY|SECRET|
      TOKEN)\s*=\s*['"]?[^'"\s]{12,}` and vendor prefixes (`sk-`, `xai-`, `fw_`, `AKIA[0-9A-Z]{16}`).
    - on a match: `✋ ConstraintError` with file:line, exit 2.
    - escape hatch: a `# secret-scan:allow` marker on the line.
    - raw paths and the stderr route share #681's hook shape.
    - clamp via a `.play` integration test like `check.timestamps.play`.
- **disposition:** D1 for ask 2. ask 1 closes with 85646f0.
- **fulcrum (80%):** a hand-rolled sh scan. alternative = gitleaks, which is a host binary. the round
  removes host-binary deps (#601, #645), so it would need a declared npm wrapper.

## #512 — depcheck: ignore vendored `.agent/repo=<other>/` dirs

- **state:**
  - the two named false positives (`declastruct-aws`, `declastruct-unix-network`) are already in
    `.depcheckrc.yml:6-10`, via 84bcee7 (#533). so the reported failure is D0.
  - the general ask (ignore every non-`.this` vendored dir) is open. the template has no
    `ignorePatterns` key.
- **overlap:** #639 lands `ignorePatterns: [.agent/.actors]` and a fix fn that merges
  `ignorePatterns`. that is the same key and the same merge.
- **class:** B5. delivery: C2. care: alt.
- **fix sketch:** #639's `ignorePatterns` also carries `.agent/repo=*/` and
  `!.agent/repo=.this/`. keep the two explicit ignores, since a consumer may still list them as real
  deps. clamp: a fixture with a vendored skill that imports an undeclared package goes depcheck-
  green, and a `.this` skill with an undeclared import stays red.
- **disposition:** D1-via-#639.
- **fulcrum (80%):** that depcheck's `ignorePatterns` honors gitignore-style negation. fallback:
  enumerate `.agent/repo=*` minus `.this` in the fix fn.

## #492 — ghlitch + operator/deployer/observer roles for aws-backed repos

- **state:** D0, eaf6b26 (#526). `rhachet-roles-ghlitch` is a declared devDep
  (`rhachet/best-practice/package.json:11`). `operator observer deployer` are in
  `prepare:rhachet` (`:15`).
  - the delivery is unconditional: rhachet sits in core, so it reaches every usecase, wider than
    "aws-backed".
  - the keyrack criterion is met by each role's own `keyrack.yml`, which `rhachet init --keys`
    extends into the repo manifest (see this repo's `.agent/keyrack.yml` `extends:`).
- **disposition:** D0. close with eaf6b26 and a note on the wider scope.
- **fulcrum (85%):** that the unconditional delivery satisfies the reporter. alternative = branch on
  `awsAccountId` (usecase-aware) to narrow it.

## #491 + #487 — keyrack AWS_PROFILE in env.all, with `is-optional-if-has`

- **kind:** practice report, this repo. one fix serves both.
- **state:** open.
  - no keyrack template exists: `rhachet/best-practice/.agent/keyrack.yml.declapract.ts` is
    `FileCheckType.EXISTS` only.
  - no `AWS_PROFILE` or `is-optional-if-has` appears anywhere in `src/practices`.
  - yet the emitted `useKeyrack` (`tests-node/best-practice/src/.test/useKeyrack.ts:187,209`)
    relies on `keyrack.source` to set AWS_PROFILE for an aws consumer, and throws (#564) when it is
    absent.
  - `is-optional-if-has` is supported by the published rhachet (hydrate + strict-mode waiver in
    1.48.0's dist). #689 floors rhachet at 1.49.2, which is published (`npm view rhachet version`).
  - not covered by #611/#612/#651 (those change useKeyrack, not the manifest).
- **class:** B5 (an aws service's first local integration run fails until a human adds the key).
  delivery: C2. care: alt (the error names its fix).
- **fix sketch:**
  - the rhachet `.agent/keyrack.yml` declaration becomes a check/fix findsert. when the project
    declares `awsAccountId` (the same gate useKeyrack uses), `env.all` must hold
    `{ key: AWS_PROFILE, is-optional-if-has: AWS_ACCESS_KEY_ID }`.
  - a bare `- AWS_PROFILE` entry is upgraded in place. other keys, `extends`, and `org` are kept.
  - no keyrack.yml → findsert creates it only for an aws consumer. otherwise EXISTS semantics stay.
  - findsert, so scope-safe (`rule.avoid.runtime-forks`).
  - clamps: an extant manifest with bare AWS_PROFILE, an extant one without it, a non-aws repo
    unchanged, plus a twice-applied case.
- **disposition:** D1 (one commit, `#487` + `#491`).
- **fulcrum (75%):** the owner is rhachet's declaration (one owner per file, #630). alternative = a
  new declarer in environments-aws, a second owner that the multi-declarer clamp would need to
  allowlist. clean move.

## #490 — useKeyrack pattern for aws-dependent services

- **state:** D0, b8d4803 (#605).
  - `tests-node/best-practice/src/.test/useKeyrack.ts:169-211` exports the SSO-to-static-cred
    export for aws-sdk-v2, and its jsdoc names it the org `useKeyrack` convention.
  - it is wired into `jest.integration.env.ts:46-49` and `jest.acceptance.env.ts:31-33`.
  - the `use.testdb.sh` half has no template in this repo. testdb access is the
    rhachet-roles-ghlitch `use.testdb` skill, so that half belongs there.
  - #611/#612/#623 refine useKeyrack this round.
- **disposition:** D0. close with b8d4803. the comment notes that the use.testdb half belongs to
  rhachet-roles-ghlitch.
- **fulcrum (85%):** that the reporter accepts the testdb half as out of this repo.
