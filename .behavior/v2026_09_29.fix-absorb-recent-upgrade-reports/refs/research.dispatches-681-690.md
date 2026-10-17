# research — dispatches #681–#690 (seed S12)

each claim verified against this tree on 2026-10-14. paths are under `src/practices/`.

## #681 — check.timestamps names its error class, reads raw paths, keeps git stderr out of the scan

- **verdict:** confirmed, all five gaps.
- **evidence:** `husky/best-practice/.husky/check.timestamps.sh:24` — `git diff --cached --name-only`
  with no `core.quotepath=off`, so a non-ascii path is quoted and `git show` at `:40` fails as a
  false malfunction · `:40` — `2>&1` folds git stderr into the scanned bytes · `:41-42`, `:51-52` —
  no error class; the halt goes to stdout and says "in snapshots" · exit codes already fit (`:43`
  = 1, `:53` = 2) · the test reads stdout only (`check.timestamps.play.declapract.integration.test.ts:35-37`).
  EQUALS (no `.declapract.ts`); this repo's own hook is byte-identical.
- **fix:** C1 — `git -c core.quotepath=off`, drop `2>&1`, `💥 MalfunctionError:` / `✋ ConstraintError:`
  to stderr, drop the `└─ $content` echo, test reads stderr, resnap; non-ascii and unreadable-blob
  cases. bound: a path that holds `"`, tab, or newline is still quoted (a `-z` loop fights the
  heredoc design at `:27-28`).
- **class / care:** B1 + B3 + B6 · alt.
- **overlaps:** #641 (same lines; the pattern widen is still absent at `:14`) and #684 — one edit.

## #682 — reuse a module-scope pg pool across lambda invokes

- **verdict:** confirmed as described, but the issue gates itself on a pave that has not shipped.
- **evidence:** `persist-with-rds/best-practice/src/utils/database/getOneDatabaseConnection.ts:63-71`
  opens a `new Client` per call; `withDatabaseContext.ts:34-35,50` opens and ends it.
  `ahbode/svc-service-providers#68` is OPEN.
- **hazard:** `max: 1` deadlocks a nested un-forwarded open; gate it on `cloud@aws.lambda`. same file
  as #652, #664, #673 (a pool per mode).
- **class / care:** B7 · alt.
- **disposition:** held until svc-service-providers#68 ships (seed S5 — only shipped work).

## #683 — old-dev-config-location must keep prep's `__CHANG3_ME__` db passwords

- **verdict:** partly. the bad-practice rewrites the placeholder, but the issue's one-file fix does
  not converge: `persist-with-rds/best-practice/config/prep.json:11,15,20` declares `$.at(aws::param)`
  and its CONTAINS fix (`prep.json.declapract.ts:5-14`, a shallow spread) writes it straight back.
- **evidence:** `bad-practices/old-dev-config-location/config/dev.json.declapract.ts:13-14,21-25`
  (`withAwsParamPlaceholder`) · `provision/schema/deploy.database.sh:92-98` and
  `sql/init/user.service.sql:6` create prep users with the literal placeholder · `deploy.database.sh:47-59`
  reads ssm for prod only · `test.json:11,15,20` keep the placeholder · the cited read of
  `/svc-quotes/prep/database.role.*.password` is #637's derived name, half-shipped.
- **fix:** C2 on two declarations — drop the placeholder rewrite in the bad-practice; prep.json's
  check accepts either value at the three password leaves, and its fix deep-merges and keeps an
  extant password. a hard flip would break an adopter who seeded real prep secrets.
- **class / care:** B1 · crit.

## #684 — check.timestamps must exempt the achiever ask log

- **verdict:** confirmed; `check.timestamps.sh:33-36` exempts only `*.ts | *.sh`.
- **fix:** C1 — `.goals/* | */.goals/*) continue ;;`, a header line on why (an append-only transcript
  cannot permadrift), a pass case for `.route/x/.goals/asks.inventory.jsonl` and a halt case for a
  `.snap` with the same clock. lands with or before #641's widened pattern.
- **class / care:** B5 · crit (a pasted clock deadlocks the commit against `goal.guard`).

## #685 — cicd-service provision.yml is CONTAINS with no fix

- **verdict:** confirmed. on declapract 0.13.26 a non-json CONTAINS file gets
  `fixContainsWhenFileDoesntExistBySettingDeclaredContents`, which returns `{}` when the file exists:
  `apply` reports automatic, changes no byte, and the check stays red.
- **evidence:** `cicd-service/best-practice/.github/workflows/provision.yml.declapract.ts:74` (no
  `fix`) · `.terraform.yml:5-29`, `.sql-schema-control.yml:5-31` — the callees are EQUALS and
  oidc-only, so a pre-oidc caller (`github-environment` / `aws-account-id` / access-key `secrets:`,
  before #533) fails with `startup_failure`, absent from `gh pr checks` · the readme
  (`.declapract.readme.md:18-22`) already admits extant repos need a hand edit.
- **fix:** C2 — a merge-by-job fix (yaml `Document` API): each declared job is overwritten with its
  declared shape, adopter jobs kept; a custom check passes when every declared job matches. never
  strip undeclared jobs — `rds-jobs-in-non-rds-service` owns that, with its callee-on-disk guard.
  idempotent. shares one helper with #608.
- **class / care:** B4 + B3 · crit.

## #686 — the admin→cicd, service→crud role rename ships no copy of the live param values

- **verdict:** confirmed.
- **evidence:** `persist-with-rds/best-practice/config/prod.json:7-21` (new role names) ·
  `prod.json.declapract.ts:41-50` (shallow spread drops `role.admin` / `role.service`) ·
  `bad-practices/terraform-parameters/.../parameter-store.tf.declapract.ts:31-36` drops the legacy
  read that seeded the new params · `provision/aws/readme.md:22-27` ("no value to move") is false for
  these repos · `.declapract.readme.md:17-26` is stale, and `:56` plus `provision/aws/readme.md:68`
  print `declapract fix`, a command that does not exist.
- **fix:** prose + marker (a fix has no aws access): the rename map in `provision/aws/readme.md` as a
  human step before the first prod plan (`cicd/for-plan` ← `admin`, `cicd/for-apply` ← `admin`,
  `crud` ← `service`), targets = #637's derived names; the terraform-parameters fix comments each
  `removed{}` block whose label holds `admin`/`service` with its target; fix the stale readme and
  both `fix` → `apply` verbs.
- **class / care:** B1 + B6 · crit.
- **overlaps:** #637 (lands together), #544. the paved copy skill (ghlitch#129) is not shipped; the
  prose names the manual copy.

## #687 — path-gate the provision.yml pull_request trigger

- **verdict:** partly. the gap is real; the issue's path list omits `config/**` and
  `src/utils/config/**`, `src/utils/environment.ts` (read by `provision/schema/connection.config.js:6-9`).
- **evidence:** `provision.yml:3-11` — bare `pull_request:` · no required-check deadlock
  (`provision-github/.../github.repo/resources.ts:104-117` requires only `suite / *` and
  `pullreq-title`) · PRs never apply (`.sql-schema-control.yml:16-19`).
- **fix:** C1 `paths:` (provision/**, config/**, src/utils/config/**, src/utils/environment.ts, the
  workflow callees + provision.yml, package.json, pnpm-lock.yaml); `push` / `workflow_dispatch`
  ungated. needs #685's fix fn first, else every adopter's check reds with no convergence.
- **class / care:** B7 · alt.

## #688 — gitignore `.agent/.notes/` beside `.agent/.cache/`

- **verdict:** confirmed; `rhachet/best-practice/.gitignore.declapract.ts:34-37` declares only
  `.agent/.cache/` and `.claude/scheduled_tasks*`.
- **fix:** C2 — one line in `ignoresSortable`; a union findsert, idempotent by construction. a note
  already tracked still needs `git rm --cached`. lands with #667 (same array, one snapshot rewrite).
- **class / care:** B5 · alt.

## #689 — the rhachet boot.yml lists the glossary variants under `not:`, not `ref:`

- **verdict:** confirmed, plus an unnamed hazard.
- **evidence:** template `rhachet/best-practice/.agent/repo=.this/role=any/boot.yml:43-46` puts both
  globs under `ref`; `boot.yml.declapract.ts:13-16,59-66,105-119,146-150` reads and re-seeds `ref`
  only, so a consumer that moved them to `not:` is flagged and reverted · `not:` first ships in
  rhachet 1.49.0 (`RoleBootSpec.ts:20-24`); 1.48.0 drops it silently · published: 1.49.0–1.49.2 ·
  practice floor `minVersion('1.47.5')` (`rhachet/best-practice/package.json:3`).
- **hazard:** 1.49.0 also enforces `budget:` (`assertBootWithinBudget.ts`), and the practice already
  writes `budget.tokens: 5000` into every consumer — a floor raise turns that inert cap into a boot
  halt.
- **fix:** C2 — template `ref` → `not`; the findsert reads and seeds `always.briefs.not ?? briefs.not`,
  moves a declared glob out of `ref`, keeps the consumer's own `ref`; floor 1.49.2; tests incl.
  `fix(fix(x)) === fix(x)`.
- **class / care:** B3 + B4 · crit (a repo that already moved meets a red check that reverts it).

## #690 — condense the prose in the src/utils/config templates

- **verdict:** confirmed (`config/best-practice/src/utils/config/getConfig.ts` ~31 comment lines,
  `persist-with-rds/best-practice/src/utils/config/config.schema.ts` ~43). EQUALS, so adopters
  cannot trim locally.
- **fix:** C1 — cut to one fact once; long rationale moves to the practice readme. the clamps assert
  code substrings only, so a prose cut stays green. order after #658 so the schema text is rewritten
  once; same pass as #648.
- **class / care:** B6 · alt.
