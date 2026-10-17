# research — cicd / lint / prose cluster (#630 rest, #607, #616, #628, #601, #600, #645, #648 rest)

## the two core mechanisms (declapract@0.13.26)
- FIX_MANUAL gate: `plan/getRequiredActionForFile.js:16` marks a file FIX_MANUAL if any failed check is not fixable; `evaluateProjectAgainstFileCheckDeclaration.js:82-89` counts a check fixable only when a fix exists AND the fix changes the file. so one best-practice EXISTS check, one fix-less custom check, or one non-JSON CONTAINS whose fix is a no-op blocks every fix on that file.
- fix order = practice-name order (`applyPlan.js:36`): two EQUALS that disagree → alphabetically later wins each pass → stable 2-cycle.

## #630 (rest) — files declared by more than one practice (same usecase only)
| file | declarers | conflict | fix | conf |
|---|---|---|---|---|
| `src/utils/config/config.schema.ts` | config (EQUALS) + persist-with-rds (EQUALS), both in lambda-service-with-rds | 2-cycle | persist-with-rds owns content; `config` gains a `.declapract.ts` — check passes on config's base OR the persist-with-rds variant; fix writes base only when absent | 70% |
| `src/utils/config/getConfig.ts` | config template vs `typescript-any/bad-practices/relative-imports` | 2-cycle (`getConfig.ts:7` `from '../environment'`) | template → `@src/utils/environment` | 95% |
| `src/utils/database/getOneDatabaseConnection.ts` | persist-with-rds vs relative-imports | 2-cycle (lines 4-5) | → `@src/utils/config/getConfig`, `@src/utils/environment`; update `persist-with-rds/.declapract.integration.test.ts:162` | 95% |
| `src/contract/commands/sayHello.ts` | commands vs relative-imports | 2-cycle (4-5), found here | → `@src/utils/environment`, `@src/utils/logger` | 90% |
| `.husky/check.lockfile.sh` | husky (EQUALS, npm block 8-10) vs `pnpm/bad-practices/husky-lockfile-check` | 2-cycle, both core | husky owns; drop the npm block | 85% |
| `.github/workflows/test.yml` | cicd-common (EQUALS+fix) + cicd-app-react-native-expo (EQUALS), both expo usecase | 2-cycle (line 7 `main` vs `'main'`, line-16 comment) | cicd-common owns; delete expo copy, move its id-token comment in | 85% |
| `provision/aws/environments/{dev,prod,test}/main.tf` | environments-aws (EXISTS no fix, declares dev) vs terraform-aws (EQUALS prep/prod/test + `old-dev-env-dir` moves dev→prep) | never converges (dev EXISTS fails forever → FIX_MANUAL) | delete the three environments-aws declarations | 85% |
| `provision/aws/environments/test/main.tf` | terraform-aws (EQUALS) + persist-with-dynamodb (CONTAINS `endpoints{}`, no fix) | never passes in lambda-service-with-dynamodb | delete the dynamodb claim (terraform on its way out) | 60% |
| `.husky/check.commit.sh`, `.husky/commit-msg` | husky + conventional-commits | identical today; drift risk | husky owns; drop from conventional-commits (S20) | 65% |
- no conflict: `config/*.json`, `variables.tf`, `tsconfig.json`, `environment.ts`, `.gitignore` (union by design), `package.json`.
- clamps: (1) per usecase in useCases.yml (`getAllPracticesForUsecase` + `getAllPathsUnderDir`), a path with ≥2 declarers fails unless allowlisted (`package.json`, `.gitignore`, CONTAINS-subset pairs); (2) no emitted template under `src/**` contains `from '../` (red today on 3). idempotency: executeApply twice on a lambda-service-with-rds fixture and an expo fixture → pass 2 changes 0 files.

## #607 — declared file w/ shipped fix left unapplied
- root cause: the FIX_MANUAL gate. poisons: EXISTS best-practice claims, fix-less custom checks, non-JSON CONTAINS (e.g. `lint/.depcheckrc.yml` — a text-contains check fails when an adopter interleaves entries, the union fix adds naught → unfixable → FIX_MANUAL). for app-protools-native the `test.yml` double-claim is a likely contributor (55%).
- fix here: remove the #630 conflicts; a test over all declarations that check(fix(x)) passes on representative adopter input; the twice-apply convergence test.
- upstream: `ehmpathy/declapract` — `apply` should report leftovers; `declapract.upgrade` exec (rhachet-roles-ehmpathy) should run `declapract plan` after apply and fail on non-empty. file issues there.
- conf: 80% on the mechanism.

## #616 + #628 + #601 — lint:cycles
- not one fix but same lines; ship together. #616 = syntax (`lint/best-practice/package.json:13` `join(...) // "^$"`); #628 = policy scope (`.dpdmrc.yaml` comments); #601 = undeclared `yq`. #601's fix removes #616's line.
- measured: shipped `exclude: []` renders `--exclude ""` → dpdm checks all; node_modules in scope IS the policy (`.dpdmrc.yaml:3-5`, `rule.forbid.dpdm-exclude-change`). contradiction: policy allows devDep entries, but `.dpdmrc.yaml` is EQUALS so apply deletes any adopter entry.
- fix: command → `EXCL=$(node -p "(require('yaml').parse(require('fs').readFileSync('.dpdmrc.yaml','utf8'))?.exclude ?? []).join('|')") && dpdm … --exclude "$EXCL" 'src/**/!(*.test).ts'` (fails closed); add `yaml` (2.9.1) to lint devDeps + `.depcheckrc.yml` ignores; package.json CONTAINS fix rewrites the value in adopters. #628: `.dpdmrc.yaml.declapract.ts` — check passes if `exclude` is an array w/o a `node_modules` entry; fix writes only when absent; comment scopes policy (type-only cycles never excluded; third-party require cycle in a devDep → entry with a cited reason; in a prod dep → upstream dispatch or replace dep).
- tests: extend `lint/dpdmrc-exclude-policy.declapract.integration.test.ts` — run the exact expression on a doc w/o `exclude` → exit 0 empty (old form red); `exclude: [jest]` passes; `node_modules` fails; fix(fix(x)) = fix(x).
- conf 75%.

## #600 — terraform version pin
- `terraform-common/best-practice/.terraform-version` = `0.14.11`; `terraform-aws/.../{prep,prod,test}/versions.tf:2` require `>= 1.7`.
- fix: pin a 1.x ≥ 1.7 (best guess 1.9.8, 55% on the number — confirm latest). clamp: `.terraform-version` satisfies every best-practice `required_version`.

## #645 — remove terraform fmt (seed S1)
- delete `terraform-common/best-practice/package.json` + its `.declapract.ts` (hold only the two commands).
- `format/best-practice/package.json.declapract.ts:11-12,35-42`: drop `usesTerraform` / `asActiveFormatters` → biome only. update `format/package.json.declapract.test.ts:3-31` + snapshot `:6-7`.
- `package-json-order/.../package.json.declapract.ts:29,62`: drop the two terraform keys.
- `cicd-common/.../.test.yml:85-86`: drop `set terraform version` in test-format; update `src/__snapshots__/actionPins…snap:15`.
- adopters: format's CONTAINS JSON fix replaces `fix:format`/`test:format` values → biome only; it never deletes keys, so a new bad-practice `format/bad-practices/terraform-formatter/package.json.declapract.ts` (detect `fix:format:terraform`|`test:format:terraform`; fix deletes both). home: format (core, survives terraform removal) (75%).
- tests: unit check/fix + idempotency; executeApply on a chained-command fixture → no `terraform` in scripts; second apply no-op.

## #648 (rest) — condense provision prose
- named: `persist-with-rds/.../provision/aws/readme.md` (79 lines; line 71 stale "bump required_version"); `resources.parameters.ts` (106; KEEP/absent-throw explanation thrice: 11-17, 45-50, 66-71; line 85 cites `#613`); `provision-github/.../github.repo/resources.ts` (245).
- correctness: line 102 keep `requireLinearHistory: false` (squash-only merges already linear), fix comment (75%); line 49 `private` is optional + derived from `visibility` (declastruct-github `DeclaredGithubRepo.d.ts:43`) → drop the line + todo (80%; re-check at the ≥1.7.2 floor); collapse the two "things we haven't changed" comments and `.why` blocks 160-164, 174-181, 204-206.
- corpus sweep (issue numbers / todos in emitted templates): `jest.integration.env.ts:49`, `jest.acceptance.env.ts:33`, `jest.{integration,acceptance}.prepare.ts:15`, `tsconfig.build.json:16`, `artifact.yml:5`, + the two above. heavy-prose candidates: persist-with-rds `config.schema.ts`, `getConfig.ts`, `.dpdmrc.yaml`, `environment.ts`; `useKeyrack.ts`, `useWakeOfLivedb.ts`, `.test.yml`, `.declastruct.yml`, `.deploy-sls.yml`, `serverless.yml`, `biome.jsonc`.
- clamp: no `#\d{3,}` or `todo:` in any emitted best-practice file (excl. `.declapract.ts`, `.declapract.readme.md`). guards that must stay green: `bestPracticeTemplateParse`, `ssm-cicd-param-names`, `stageAccessBridge`, `github-environment-set`. order: #637 before the `resources.parameters.ts` trim.
