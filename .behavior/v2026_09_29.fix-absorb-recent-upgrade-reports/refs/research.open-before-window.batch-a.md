# research.open-before-window — batch a

open issues filed before the 2026-09-15 window: #599 585 556 553 552 551 550 523 516 513 571.
each verdict reads the current tree (branch `beav/fix-absorb-recent-upgrade-reports`, HEAD 8c4c1fe
v0.49.13) and the inventory `1.vision.experience.case=_.md`.

legend as the inventory: class B1–B7 · delivery C1 equals / C2 merge / C3 new bad-practice ·
care crit/alt · disposition D0 / D1 / D1-via-#6xx / D2 / other-repo.

## summary

| # | short title | disposition | class / delivery / care | fulcrum |
|---|-------------|-------------|-------------------------|---------|
| 599 | pin third-party actions to full shas | **D0** — 551d342 (PR #559), v0.49.10 | — | — |
| 585 | preflight LLM provider keys before shards | **D1** | B7 / C1 (`.test.yml` EQUALS) / alt | F-a 70%: provider map in the template vs a `keyrack firewall --verify` in rhachet |
| 556 | sha pins have no bump path | **D1** (repo-own, no consumer file) | B7 / repo-own workflow + command / alt | F-b 70%: scheduled bump workflow here vs dependabot (tail-comment + `src/practices/**` scan unverified) |
| 553 | acceptance suite on the deploy runtime | **D1** | B7 / C1 `.test.yml` job + C2 `package.json` command / alt | F-c 60%: handler load-check in `node:<major>` docker vs full acceptance; alt = close as superseded by #552 |
| 552 | derive serverless runtime from `.nvmrc` | **D1** | B7 / C2 (serverless.yml fix fn) / alt | F-d 75%: read the consumer's `.nvmrc` at check time vs read node practice's `.nvmrc` in-library |
| 551 | build-node / deploy-runtime skew (2 practices) | **duplicate** of #552 + #553 (its successor split) | — | — |
| 550 | sha pins · job-scope id-token · public-repo secrets brief | part 1 **D0** (551d342); part 2 **D1**; part 3 **other-repo** (rhachet-roles-ehmpathy) | part 2: B7 / C1 / alt | F-e 70%: part 3 as a mechanic brief upstream vs a brief the rhachet practice ships |
| 523 | config-driven vpc tunnel + `rhx use.vpc.tunnel` | **D0** (84bcee7, v0.49.8: schema, workflows, skill delete; ghlitch floor 0.3.0) + **D1-via-#638** (nested `bastion`/`cluster` in config templates) | — | — |
| 516 | commitlint body/footer max-line to warn | body **D0** (b8d4803, v0.49.12); footer **D1** | B1 / C1 / **crit** | — |
| 513 | git.release `--from main` failfast | **other-repo** (rhachet-roles-ehmpathy) | — | — |
| 571 | index: 21 defects from svc-gateway upgrade | **D0** for every shipped row + **D1-via-#685** (comment: provision.yml) + via #629/#654, #661, #642/#662; row 1 and D34's meta-check **other-repo** (ehmpathy/declapract, declapract#107) | — | — |

## #599 — pin third-party actions to full-length shas

1. practice report for this repo (the `uses:` refs live in practice templates).
2. **already fixed in tree.** commit `551d342` "fix(workflows): pin every third-party action ref to a
   full-length commit sha (#559)", in `v0.49.10`. every ref in the templates now reads
   `owner/repo@<40-hex> # <tag>` — e.g. `cicd-common/best-practice/.github/workflows/.test.yml:32`
   (`actions/checkout@11d5960… # v4`), `:86` (`hashicorp/setup-terraform@b9cd54a… # v3`),
   `cicd-service/…/.sql-schema-control.yml:59,75`. the clamp the issue asks for exists:
   `src/actionPins.declapract.integration.test.ts` walks `src/practices/**` and `.github/**` and asserts
   shape, tail, and one sha per action repo (header at :8-16). the issue was filed against
   `0.47.70`; a consumer that upgrades past `0.49.10` receives the pins.
3. —
4. **D0** — close with a comment that cites `551d342` / PR #559 / `v0.49.10`.

note: #645 (terraform fmt removed, S1) drops the `hashicorp/setup-terraform` step at `.test.yml:85-86`;
the pin table loses one action repo there, and the actionPins clamp tolerates a removal.

## #585 — preflight-check every LLM provider key before the shards fan out

1. practice report for this repo — the shared `.test.yml` that fans out the shards is a `cicd-common`
   template (`.test.yml:182` `test-shards-integration`, `:204-215` prepare:rhachet + keyrack firewall
   per shard). no overlap with any #6xx row.
2. **open work.** no preflight job exists; each shard runs `keyrack firewall` on its own, and a
   rejected key surfaces as N red shards.
3. class **B7** (feature: a named diagnosis for a credential the provider rejects); delivery **C1**
   (`.test.yml` is EQUALS with a replace-fix, `.test.yml.declapract.ts:8,19-26`); care **alt** (a
   diagnosis speedup — the shards already go red).
   fix sketch: a `preflight-keys` job in `.test.yml` (`needs: [install]`) that runs `prepare:rhachet` +
   the keyrack firewall, then for each provider env var present (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
   `FIREWORKS_API_KEY`, `XAI_API_KEY`) calls the provider's cheapest authed endpoint (list models,
   never a generation); 401/403 → `✋ ConstraintError: $KEY is rejected by $provider — rotate the repo
   secret`, exit 2; an absent var is skipped (not every repo has an LLM). `test-shards-integration` and
   `test-shards-acceptance` gain `needs: preflight-keys`. clamp: a play test of the step over a stub
   endpoint (401 → exit 2, 200 → 0, var absent → 0).
   **fulcrum F-a (70%)**: the provider→endpoint map lives in the template (static, ~4 rows, ships now)
   vs a `rhachet keyrack firewall --verify` capability upstream (one map for every repo, no curl in
   yaml, but other-repo work → D2 under S5). rework is clean: the job can later call the upstream verb.
4. **D1**.

## #556 — the sha pins have no automated bump path

1. practice report for this repo, but the deliverable is **repo-own maintenance**, not a template:
   a consumer must not bump a pin itself — `cicd-common` workflows are EQUALS (`.test.yml.declapract.ts:8`),
   so a consumer-side bump is reverted by the next apply. the bump belongs where the templates are
   authored. measured: no `dependabot.yml` or renovate config in `.github/` (`git ls-files .github`:
   only `actions/please-release` + 9 workflows) nor in any practice.
2. **open work.** the pin procedure is documented as prose in `src/actionPins.declapract.integration.test.ts`
   (deref annotated tags; one sedreplace over both surfaces) but no mechanism runs it.
3. class **B7**; delivery: repo-own `.github/workflows/` + a node command (no C1/C2/C3 — no consumer
   file; this answers the issue's task 2: no new file ships to consumers); care **alt**.
   fix sketch: a scheduled `bump-action-pins.yml` (weekly + dispatch) runs a procedure that lists each
   unique `owner/repo@<sha> # <tag>`, resolves the newest tag within the pinned major via
   `gh api -X GET repos/<o>/<r>/git/ref/tags/<tag>` with the `.object.type == tag` deref the test header
   names, rewrites `@<sha.old> # <tag.old>` → `@<sha.new> # <tag.new>` across `src/practices/**` and
   `.github/**` in one pass, and opens a PR; the extant actionPins clamp (shape, tail, one-sha-per-repo)
   gates it. the tail moves with the sha by construction (answers task 1 for this path). clamp: a unit
   test of the resolver over a fixture tag table, incl. an annotated tag.
   **fulcrum F-b (70%)**: own procedure vs dependabot `github-actions`. dependabot is zero-code but two
   facts are unverified — whether it rewrites a `# v4` major-only tail, and whether it scans
   `<dir>/.github/workflows` under `src/practices/*/best-practice`. if both hold, a 10-line
   `.github/dependabot.yml` replaces the procedure. rework clean either way.
4. **D1**.

## #553 — run the acceptance suite on the deploy runtime

1. practice report for this repo (companion to #552). no #6xx row: #664's "version-skew job" is the
   postgres engine (`refs/research.dispatches-653-670.md:147`, `rds:DescribeDBClusters`), not node.
   the prior round named it case=8 (`.behavior/v2026_08_31.fix-lambdas-3/1.vision.experience.case=8…md`,
   "no code exists yet", tier E `5.1…yield.md:144` unchecked).
2. **open work.** no practice serves the artifact on the deploy node; the issue's shape
   (`start:prod:server`, `startExpressServer`, `contents.run.isolated.js`) has **zero** matches in
   `src/practices` — it is an `aether-auctions` next.js shape, not a lambda-service one.
3. class **B7**; delivery **C1** (a `test-deploy-runtime` job in `.test.yml`, which is EQUALS) +
   **C2** (`serverless` practice `package.json` gains `test:deploy-runtime`); care **alt**
   (with #552 the two majors are derived-equal, so the residual is a dep that needs a newer node
   minor than lambda's 22.x — narrow).
   fix sketch: `test:deploy-runtime` reads the major from `serverless.yml` `provider.runtime`,
   preflights `docker info` (absent daemon → named ConstraintError), and runs `node:<major>` over
   `.artifact/contents` to `require` every handler under `dist/contract/handlers` and invoke each with
   a minimal event; the `.test.yml` job runs `npm run build && npm run test:deploy-runtime --if-present`
   so non-serverless consumers no-op. not wired into `npm test` (keeps docker off prepush, per #551 §3).
   **fulcrum F-c (60%)**: a load+invoke check in docker (static lambda imports make a load real
   coverage, unlike next's lazy pages) vs the issue's full acceptance-on-deploy-node via a launcher
   (truer, but needs a server shape this library does not ship). alternative verdict: close as
   superseded by #552 once the majors are one derived value. rework clean.
4. **D1** (or close-as-superseded per F-c).

## #552 — derive serverless.yml runtime from .nvmrc

1. practice report for this repo.
2. **partly true already, residual open.** today both files are pinned to the same literal by two
   practices: `node/best-practice/.nvmrc:1` = `v22.21.0` (EQUALS, no companion) and
   `serverless/best-practice/serverless.yml:25` = `runtime: nodejs22.x` (CONTAINS,
   `serverless.yml.declapract.ts:4`), whose fix rewrites any `nodejs\d\d.x` to the literal
   `nodejs22.x` (`serverless.yml.declapract.ts:56-60`). so after `apply` a consumer has parity — the
   app-employee-web drift (nodejs14.x) is closed for a consumer on both practices. the gap: two
   literals in two practices, and no mechanism ties them, so a library bump of one ships skew to every
   consumer; and the fix's regex hardcodes `22`.
3. class **B7** (single-source hardening; the issue's "one source, not two"); delivery **C2** (the
   serverless.yml fix fn); care **alt**.
   fix sketch: `serverless.yml.declapract.ts` reads the consumer's `.nvmrc` major (neighbor read via
   the project root) and both checks `provider.runtime: nodejs<major>.x` and rewrites to it; the
   template line becomes the derived value. clamp: an integration test with `.nvmrc` = v22 and
   runtime nodejs14.x → rewritten to nodejs22.x; and a library clamp that the node practice's
   `.nvmrc` major equals the serverless template major (bites if one is bumped alone). idempotent on
   a second apply.
   **fulcrum F-d (75%)**: consumer `.nvmrc` at check time (covers the reverse direction the issue
   asks — a `.nvmrc` bump carries the runtime) vs in-library derivation from the node practice's
   `.nvmrc` (simpler, but a compiled practice that reads a sibling practice's file is a path hazard).
   rework clean.
4. **D1**.

## #551 — guard against build-node / deploy-runtime skew

1. practice report for this repo.
2. **duplicate.** #551 asks for (1) a consumer `serverless.runtime.test.ts` parity test and (2)+(3) a
   docker deploy-runtime acceptance check gated in ci. #552 and #553 are its split successors (#553's
   body: "companion to #552"); the prior round itself grouped them (`5.1…yield.md:144` "#551/#552/#553").
   practice (1) is a detector of a divergence #552 makes inexpressible, so it is not owed as well.
3. —
4. **duplicate** — close with a pointer to #552 + #553.

## #550 — sha pins, job-scope id-token, public-repo secrets brief

1. practice report for this repo (parts 1-2); part 3 is a role brief.
2. part 1 **already fixed** (`551d342`, see #599). part 2 **open**: `id-token: write` still sits at
   workflow scope in `cicd-common/…/.test.yml:16-18`, `.declastruct.yml:62-64`,
   `cicd-service/…/.sql-schema-control.yml:33-35` (and the caller `test.yml:16`). part 3 **open**: no
   practice ships a brief — the only `.agent/` template is rhachet's `boot.yml` + `keyrack.yml`.
3. part 2: class **B7** (least-privilege hardening), delivery **C1** (the callee workflows are
   EQUALS), care **alt**.
   fix sketch: callee workflows drop to `permissions: contents: read`; only the jobs that run
   `configure-aws-credentials` (`.test.yml` `test-shards-integration`, `test-shards-acceptance`; the
   plan/apply jobs of `.sql-schema-control.yml`, `.terraform.yml`, `.declastruct.yml`, `.deploy-sls.yml`)
   gain job-level `id-token: write`. callers keep the grant on the `uses:` job (a callee job cannot
   exceed its caller — the escalation `551d342`'s second commit fixed). clamp: a structural walk that
   asserts no workflow-level `id-token` in a callee and that every job with `configure-aws-credentials`
   carries it (bites if a job loses it → the startup_failure shape).
   part 3: **fulcrum F-e (70%)** — the getter-plus-failloud discipline for secrets in a public repo is
   a mechanic code rule, so its home is a brief in `rhachet-roles-ehmpathy`'s mechanic role (every
   consumer already boots it) rather than a new brief the rhachet practice stamps into every
   consumer's `.agent/repo=.this/`. alternative: ship it from this repo's rhachet practice
   (precedent: its `boot.yml`). rework clean.
4. parts 1-2 **D1** (part 1 cited as D0); part 3 **other-repo** (rhachet-roles-ehmpathy) — a caught
   dream under S5; close #550 once part 2 lands, with the dream cited.

## #523 — config-driven vpc tunnel + migrate cicd-service to `rhx use.vpc.tunnel`

1. practice report for this repo.
2. mostly **already fixed** (`84bcee7`, PR #533, `v0.49.8`):
   - schema declares the nested shape: `persist-with-rds/…/config.schema.ts:74-87`
     (`bastion: { exid }`, `cluster: { name }`, `local`, `lambda` nullable);
   - workflows call the ghlitch skill after `prepare:rhachet`: `.sql-schema-control.yml:81-85, 147-151`,
     `.deploy-sls.yml:105-111`;
   - the hand-rolled `use.vpc.tunnel.ts` is gone (`git ls-files 'src/practices/*use.vpc.tunnel*'` empty);
   - ghlitch floor `rhachet/best-practice/package.json:11` = `0.3.0` ≥ 0.2.5 (published: `npm view
     rhachet-roles-ghlitch versions` lists 0.3.0).
   **residual**: the config templates still emit the scalar shape the issue's CORRECTION forbids —
   `persist-with-rds/best-practice/config/prep.json:24-25` (`"bastion": "vpc-main-bastion"`,
   `"cluster": "@declapract{variable.databaseName}"`), which fails the schema at :75-76. covered by
   **#638** ("config `bastion: { exid }`, `cluster: { name }` derived from the host; deep merge;
   config-validates-schema clamp"). schema ownership is #658.
3. —
4. **D0** (84bcee7) **+ D1-via-#638** — close with #638's commit.

## #516 — commitlint body/footer max-line-length to warnings

1. practice report for this repo.
2. body half **already fixed**: `conventional-commits/best-practice/commitlint.config.js:9`
   `'body-max-line-length': [1, 'always', 140]`, commit `b8d4803` (PR #605, `v0.49.12`), clamp
   `commitlint-body-max-line.declapract.integration.test.ts`. footer half **open**: no
   `footer-max-line-length` rule in the file (:3-25), so config-conventional's error-level 100 holds.
   the 2026-09-28 comment measured the break: a squash folds sub-commit bodies under the first
   `Co-authored-by:` trailer, they parse as footer, and `test:commits` over `LAST_TAG..HEAD` errors on
   every PR until a tag lands (ahbode/svc-chat #145). no #6xx row.
3. class **B1** (the emitted config reds the release-branch lint on a legal body line); delivery
   **C1** (`commitlint.config.js` has no companion → EQUALS); care **crit** (blocks every PR on main
   until the next tag).
   fix sketch: add `'footer-max-line-length': [1, 'always', 140]` after :9 with the squash/trailer
   comment; clamp = footer twin of the body integration test (asserts `[1, ` and `140]` on the footer
   line, before/after snapshot), teeth = drop the line → red.
4. **D1**.

## #513 — git.release: failfast + require articulation for `--from main` from a branch

1. **act in another repo.** no practice ships a `git.release` skill (`git ls-files
   'src/practices/*git.release*'` empty); the skill lives in `ehmpathy/rhachet-roles-ehmpathy`
   (mechanic role, `skills/git.release/`). the issue's own note ("ships via
   declapract-typescript-ehmpathy") is wrong.
2. not in this repo's scope; no #6xx row.
3. —
4. **other-repo** — `ehmpathy/rhachet-roles-ehmpathy`. under S5 no work there this round; transfer
   the issue (or close with a pointer) and catch a reseed dream if no ticket exists there.

## #571 — index: 21 practice defects from the svc-gateway upgrade

1. practice report for this repo (an index; its filed sub-issues #572/#573/#574/#564/#547 are all
   CLOSED per `gh issue list`).
2. row-by-row against the tree (the prior round's roster is
   `.behavior/v2026_08_31.fix-lambdas-3/5.1.execution.from_vision.yield.md:51-189`):

   | row | status in tree |
   |-----|----------------|
   | D27 · D28 · D29 · D31 · D51 | **D0** — sub-issues #572/#573/#574 closed; `withoutRdsJobs` at `cicd-service/…/provision.yml.declapract.ts:47` |
   | D52 | **D0** — the mandated `import { stage }` is retired (`tests-service/…/*.acceptance.test.ts.declapract.ts:14`, clamp `*.acceptance.test.ts.declapract.test.ts:40-53`) |
   | D54 · D50 · D41 · D39 · D48 · D26 · row 4 | **D0** — tier A, all checked with clamps (`5.1…yield.md:52-92`), shipped in b8d4803 / v0.49.12 |
   | 4b · D55 | **D0** — `environments/…/environment.ts:9` exports `access = envStatic.access`; `config/…/environment.ts:1-9` is a typed `string` stub, no `as any`, no `stage`, no `serviceClientStage` |
   | D53 | **D0** — `terraform-aws/bad-practices/old-dev-env-dir/provision/aws/environments/dev/*` moves `dev/` |
   | comment (2026-09-27): provision.yml CONTAINS with no fix leaves the caller behind | **D1-via-#685** — still CONTAINS, no `fix` (`provision.yml.declapract.ts:74`); #685 adds the merge-by-job fix + job-subset check |
   | row 2 (joi→zod regex) | **D1-via-#629 / #654** |
   | row 3 (Config.ts delete, not prepend) | **D1-via-#661** (`hand-written-config-type` deletes it) |
   | row 8 (uni-time symbols) | **D1-via-#642 / #662** |
   | rows 7, 9 (jest mappers, floors) | loud (tsc-caught); mappers present at `tests-node/best-practice/jest.*.config.ts:21`; floors carried by #625/#646/#660. no live defect read in tree |
   | D34 (husky +x) | perm half **D0-in-effect** — `husky/best-practice/package.json:3` runs `chmod ug+x .husky/*` on prepare (note: `pre-commit` and `check.timestamps.sh` sit at mode 100644 in the index; the latter is sourced, so harmless). meta-check half **other-repo** (declapract core) |
   | row 1 (check survives its fix — general) | **other-repo** — a declapract-core capability (`declapract#107`); the per-declaration form rides #607's check(fix(x)) test |
3. no new work beyond the rows above.
4. **D0 + D1-via-#685** (plus the #629/#654, #661, #642/#662 rows) — close #571 when #685 lands, with
   a row→commit table; row 1 and D34's meta-check point at `ehmpathy/declapract#107` (other-repo).

## overlap notes for the inventory

- #516 footer is a new **crit** row with no #6xx twin — add it to D1.
- #585, #556, #553, #552, #550-part-2 are new alt rows with no #6xx twin.
- #523 folds into #638; #571's comment folds into #685; #551 folds into #552 + #553.
- #599, #550-part-1 close as D0 with `551d342`.
- #513, #550-part-3, #571 row 1 / D34-meta are other-repo (S5: caught dreams, no filing).
