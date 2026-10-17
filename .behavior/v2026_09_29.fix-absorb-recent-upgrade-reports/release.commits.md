# release.commits — the file → issue trace behind the `closes` list

the round lands as ONE commit, after the peers pass (S17). this file is the trace that backs the pr
body's `closes #NNN` list: every changed path is cut to the issue it serves, so no `closes` line
claims an issue a file does not serve. no path was staged or committed to build it.

the pr body is `.foreman/draft.pr-body.md`. its closes list was checked against this trace: the
104 `fix(...)` sections plus #512 (served by #639's files) = 105 closes; #571 closes by comment;
#585 and #687 are not planned; the D0 (9) and D2 (9) sets match the vision inventory.

## .summary

| count | value |
|---|---|
| changed paths, total (`git status --porcelain --untracked-files=all`) | 1064 |
| route paths (`.behavior`, `.dream`, `.agent/.actors`, `.claude`) | 231 |
| non-route paths | 833 |
| D1 issues (vision inventory) | 106 (#585, #687 moved to not planned, S18) |
| issues with a section below | 106 (87 carry files; 19 are served by another issue's files) |
| paths mapped to an issue | ~795 (incl. the `.placed` rows) |
| shared paths (one carrier, several issues) | 22 rows |
| infra paths | ~38 |
| unmapped paths | 0 |

counts marked `~` are dir-grain tallies: a dir whose every path belongs to one issue is listed as
the dir, not file by file.

evidence order per path: an `#NNN` ref in the diff (or in the whole file if untracked) → the
practice dir plus the yield entry for that practice → the name of the test, fixture or snapshot.
a test, its fixtures and its snapshots ride with the fix they prove.

`P/` below = `src/practices/`. `A/` = `src/.test/assets/`. `U/` = `src/utils/`.

---

## .issues, in number order

### fix(rhachet): findsert keyrack extends per environment (#487)
- `P/rhachet/best-practice/.agent/keyrack.yml*` (findsert template, its `.declapract.ts`, tests, snapshots, fixture) — shared with #491
- `A/rhachet/declarations/practices/environments-aws`

### fix(rhachet): declare the keyrack manifest per usecase (#491)
- carrier for the keyrack findsert set above (#487 rides in this commit's files where the two meet)

### fix(husky): block a secret in a staged file (#514)
- `P/husky/best-practice/.husky/check.secrets.sh` (new), its test and snapshot
- `.husky/check.secrets.sh` (self-apply)
- `.husky/pre-commit` — shared with #684

### fix(conventional-commits): allow long body lines (#516)
- `P/conventional-commits/best-practice/commitlint.config.js`
- `P/conventional-commits/commitlint-body-max-line*` test and snapshot

### fix(typescript-any): drop the legacy tsconfig lib (#517)
- `P/typescript-any/bad-practices/legacy-tsconfig-lib/**`
- `P/typescript-any/tool-swap-removals*` test and snapshot — shared with #660
- `A/tool-swap-removals/**` — shared with #660

### fix(persist-with-rds): assert distinct testdb ports (#519)
- no own files; served by the #638 files (distinct-port assertion in `config-validates-schema`)

### fix(rhachet): build before the self-link (#520)
- `P/rhachet/best-practice/package.json.declapract.ts`
- `P/rhachet/self-link-build-order*` test, snapshot, fixture

### fix(persist-with-rds): config per access (#523)
- no own files; served by the #638 files

### fix(persist-with-rds): retire the legacy change id (#530)
- `P/persist-with-rds/bad-practices/legacy-change-id/**`
- `P/persist-with-rds/best-practice/schema/init.yml` (or its peer `init.yml`)

### fix(node-service): mark adhoc lambda clients for review (#532)
- `P/node-service/bad-practices/adhoc-lambda-clients/**`
- `U/withLambdaClientGenMarker.ts`, its test and snapshot

### fix(declastruct): fire dead checks (#536)
- no own files; served by the #607 files

### fix(persist-with-rds): one config schema (#539)
- no own files; served by the #638 files

### fix(rhachet): union the gitignore lines (#540)
- `U/defineExpectedGitignoreContents.ts`, its test and snapshot

### fix(lint): one owner per file (#541)
- no own files; served by the #630 files

### fix(config): migrate param paths (#544)
- `P/config/bad-practices/unmigrated-param-paths/**`
- `U/genUnmigratedParamPathsDeclaration.ts`, its test and snapshot

### fix(runtime-schemas): pin zod (#545)
- `U/zodVersionPinned.ts` — shared with #654
- `P/runtime-schemas/best-practice/package.json.declapract.ts` — shared with #624
- `P/runtime-schemas/best-practice/package.json.declapract.test.ts` (new) and its snapshot — shared with #624

### fix(runtime-schemas): replace joi (#548)
- `P/runtime-schemas/bad-practices/joi/**` — carrier; shared with #629, #654

### fix(cicd-common): scope id-token to the job (#550)
- `P/cicd-common/best-practice/.github/workflows/.test.yml` — carrier for the id-token hunk; shared (see table)
- `P/cicd-app-react-native-expo/best-practice/.github/workflows/.deploy-expo.yml` — id-token hunk; shared with #619, #648
- `P/cicd-package/best-practice/.github/workflows/.publish-npm.yml`
- `P/cicd-service/best-practice/.github/workflows/{.declastruct.yml,.deploy-sls.yml,.sql-schema-control.yml,.terraform.yml}` — `.declastruct.yml` shared with #648
- `src/workflowJobScopeIdToken*` test and snapshot

### fix(serverless): load each handler before deploy (#551)
- no own files; served by the #552 / #553 files

### fix(serverless): derive the lambda node runtime (#552)
- `P/serverless/best-practice/serverless.yml.declapract.ts`
- `U/getOneLambdaNodeRuntime.ts`, its test

### fix(serverless): gate deploy on a handler load (#553)
- `P/serverless/best-practice/package.json` — `test:runtime` hunk; shared (see table)
- `P/serverless/.declapract.integration.test.ts` — shared with #552, #668

### fix(cicd-common): bump action pins weekly (#556)
- `.github/workflows/bump-action-pins.yml`
- `src/actionPinsBump*` test
- `U/actionPins/**`
- `src/__snapshots__/actionPins*.snap`

### fix(rhachet): roles per usecase (#558)
- `src/useCases.yml` — shared with #520
- `src/useCases.rhachet-roles-package*` test and snapshot

### fix(persist-with-rds): one cluster name (#562)
- no own files; served by the #638 files

### fix(domain): schema over contract (#565)
- no own files; served by the #634 files

### chore(practices): index the upgrade reports (#571)
- no own files; an index issue. close by comment.

### fix(terraform-common): pin the terraform version (#600)
- `P/terraform-common/best-practice/.terraform-version`
- `src/terraformVersionPin*` test

### fix(lint): declare yaml lint (#601)
- `P/lint/best-practice/package.json` — carrier; shared with #616, #672

### fix(declastruct): fire the dead old-module-name check (#607)
- `P/declastruct/bad-practices/old-module-name/package.json.declapract.ts`, new test and snapshot
- `P/dates-and-times/bad-practices/moment/package.json.declapract.ts` (deleted) and new `moment/src/**` (F91)
- `P/node/best-practice/readme.md.declapract.ts`, its unit and integration tests, snapshot, fixture
- `src/practiceFixCoverage*` test

### fix(cicd-app-react-native-expo): provision the expo wish (#608)
- `P/cicd-app-react-native-expo/best-practice/.github/workflows/provision.yml` (new), its `.declapract.ts`, test, snapshot
- `src/provisionGithubWishPath*` test
- `U/asWorkflowMergedByJob.ts`, its test and snapshot — shared with #685
- `A/cicd-app-react-native-expo/**` — shared with #618, #676

### fix(lint): depcheck ignores per usecase (#609)
- `A/lint/**`
- `P/tests-expo/autoprune-subpath-types*` test — shared with #632

### fix(node): contention set in .npmrc (#610)
- `P/node/best-practice/.npmrc.declapract.ts`, tests, snapshot
- `U/getOneContentionSetFromLockfile.ts`, its test
- `U/getAllVersionsByPackageFromLockfile.ts` — shared with #680

### fix(tests-node): keyrack unlock per access (#611)
- `P/tests-node/best-practice/src/.test/useKeyrack.ts` (or its peer path), its test and snapshot — carrier; shared with #612, #651

### fix(tests-node): fail loud on a locked keyrack (#612)
- no own files past `useKeyrack.ts`; the hunk is listed under #611

### fix(lint): one cycles command (#616)
- `P/lint/lint-cycles-command*` test and snapshot
- `lint/package.json` cycles hunk (file carried by #601)

### fix(typescript-expo): metro config (#618)
- `P/typescript-expo/best-practice/metro.config.js`, its `.declapract.ts`, tests, snapshots — shared with #676

### fix(typescript-expo): ACCESS default on compile (#619)
- `P/typescript-expo/best-practice/package.json` — carrier; shared with #672
- `P/typescript-expo/package.json*` test — shared with #618, #676
- `.deploy-expo.yml` ACCESS hunk (file carried by #550)
- `P/tests-expo/.declapract.integration.test.ts` and snapshot — shared with #621, #647, #679

### fix(cicd-app-react-native-expo): package commands (#620)
- `P/cicd-app-react-native-expo/best-practice/package.json` — carrier; shared with #653, #672, #676
- `P/cicd-app-react-native-expo/package.json.declapract.integration.test.ts` (new) and snapshot — shared with #619, #653, #676

### fix(tests-any): wake the livedb (#621)
- `P/tests-any/best-practice/src/.test/useWakeOfLivedb.ts` (moved from tests-node)
- `src/.test/useWakeOfLivedb.ts` (root self-apply)
- `P/tests-any/livedb-wake-branches*` test and snapshot (moved); `P/tests-node` deleted copies
- `P/tests-any/autoprune-hooks*` test

### fix(tests-any): build if stale (#622)
- `P/tests-any/best-practice/package.json`
- `P/tests-any/build-ifstale*` test

### fix(tests-node): prepare files per test kind (#623)
- `P/tests-node/best-practice/jest.*.prepare.ts` — shared with #651
- `P/tests-expo/best-practice/jest.*.prepare.ts` (new) — shared with #621
- `P/tests-node/livedb-wake-prepare*` test — shared with #621, #651, #675

### fix(runtime-schemas): undercut override (#624)
- `P/runtime-schemas/best-practice/package.json`
- `P/pnpm/bad-practices/override-undercuts-dependency/**`
- `P/cicd-app-react-native-expo/.declapract.integration.test.ts` and snapshot — carrier for the final resnap; shared (see table)

### fix(cache): floor the cache member (#625)
- `P/cache/best-practice/package.json`
- `P/cache/bad-practices/unfloored-cache-member/**`
- `repo-with-retired-cache-member(-imported)` fixtures
- `P/cache/.declapract.integration.test.ts` and snapshot — shared with #644

### fix(persist-with-rds): connection out of input (#626)
- `P/persist-with-rds/bad-practices/with-connection-in-input/**`, test, snapshot
- `P/persist-with-rds/best-practice/src/**/withDatabaseConnection.ts` (deleted)
- `A/persist-with-rds-connection-in-input/**`
- `U/asInputToContextReviewMarker.ts` — shared with #635

### fix(persist-with-rds): transaction wrapper (#627)
- `P/persist-with-rds/best-practice/**/withDatabaseTransaction.ts`
- `P/persist-with-rds/database-wrappers-typecheck*` test and snapshot — shared with #633

### fix(lint): dpdm config (#628)
- `P/lint/best-practice/.dpdmrc.yaml`, its `.declapract.ts`, unit and integration tests, snapshots, fixture

### fix(runtime-schemas): joi to zod (#629)
- no own files past `joi/**` (carried by #548)

### fix(practices): one owner per file, biome-clean templates (#630)
- `src/practiceOwnerPerFile*`, `src/practiceTemplateBiomeClean*`, `src/practiceTemplateSrcAliasImports*` tests
- `P/cicd-app-react-native-expo/best-practice/.github/workflows/test.yml` (deleted)
- `P/commands/best-practice/src/**/sayHello.ts`
- `P/config/best-practice/src/utils/environment.ts` and its `.declapract.ts` (deleted)
- `P/environments-aws/best-practice/.declapract.readme.md`; three `main.tf.declapract.ts` (deleted) — shared with #607
- `P/conventional-commits/best-practice/.husky/{commit-msg,check.commit.sh}` (deleted; `husky`
  owns them, S20)
- `src/huskyCommitMsgHook.declapract.integration.test.ts` — the hook ships for every husky usecase
- `P/persist-with-dynamodb/**` (integration test, snapshot, deletions, new demo-repo)
- `U/defineExpectedContentsWithUsecaseInserts.ts`
- `P/tests-node/best-practice/jest.integration.env.ts*`
- `P/terraform-aws/best-practice/provision/aws/environments/test/main.tf.declapract.ts`
- `P/config/best-practice/provision/aws/product/variables.tf` and its `.declapract.ts` (deleted): two owners in lambda-service; config's copy was a subset of terraform-aws's; owner dedupe, clamped by practiceOwnerPerFile case1 (foreman verdict)

### fix(node-service): ask an ancient lambda (#631)
- `P/node-service/best-practice/**/sdkAwsLambdaAskAncient.ts`
- `P/node-service/.declapract.integration.test.ts` (new) and snapshot
- `P/node-service/bad-practices/simple-lambda-client/**` (src, readme, integration test, fixtures, snapshot) — package.json hunk shared with #646

### fix(tests-expo): autoprune types (#632)
- `P/tests-expo/best-practice/src/.test/assets/test-fns.autoprune.d.ts` — a stand-in until test-fns ships `typesVersions` (S25, F113)
- `P/tests-expo/best-practice/jest.{integration,acceptance}.prepare.ts` — a triple-slash reference to the stand-in
- `P/tests-expo/autoprune-subpath-types.declapract.integration.test.ts`, `P/tests-expo/.declapract.integration.test.ts` and snapshot
- `P/tests-node/best-practice/jest.unit.env.ts`, its `.declapract.ts`, test, snapshot
- `P/tests-node/catch-cause-narrowed*` test

### fix(persist-with-rds): context wrapper (#633)
- `P/persist-with-rds/best-practice/**/withDatabaseContext.ts`

### fix(domain): X.contract() over .schema (#634)
- `P/domain/bad-practices/schema-over-contract/**` — shared with #565
- defect 2 (`.ref(by)` with no `static <by>`) is a domain-objects api property; dispatched to
  ehmpathy/domain-objects as a lint/type guard (S19), so no practice here
- `P/domain/contract.declapract.integration.test.ts` and snapshot
- `A/domain-contract/**`

### fix(logs): replace the vendored log trail (#635)
- `P/logs/bad-practices/vendored-log-trail/**`

### fix(environments): ancient env access slug (#636)
- `P/environments/best-practice/src/access/sdks/sdkAwsLambdaEnvAccessAncient.ts`, `...Contemp.ts`
- `P/environments/.declapract.integration.test.ts`

### fix(persist-with-rds): ssm param names (#637)
- `P/persist-with-rds/ssm-param-names*` test and snapshot; `ssm-cicd-param-names*` (deleted)
- `P/persist-with-rds/best-practice/provision/**/resources.parameters.ts`, `resources.ts`
- `P/config/best-practice/package.json` sdk-config hunk (file carried by #656)

### fix(persist-with-rds): validate config against the schema (#638)
- `P/persist-with-rds/config-validates-schema*` test and snapshot
- `P/persist-with-rds/best-practice/config/*.json` and their `.declapract.ts`
- `U/genRdsConfigDeclaration.ts`, its test and snapshot; `U/asJsonMergedDeep.ts`; `U/asDatabaseClusterName.ts`
- `P/persist-with-rds/best-practice/**/config.schema.ts`; `demo-repo-config-schema`
- closes #519, #523, #539, #562 too

### fix(lint): depcheck ignores (#639)
- `P/lint/best-practice/.depcheckrc.yml`, its `.declapract.ts`, tests, fixtures, snapshots
- `P/lint/*denylisted-ignores*` tests and snapshot; `depcheck-denylisted-ignores` integration test
- `P/lint/.depcheckrc.yml.self-application*` test
- `.depcheckrc.yml` (self-apply)
- `.test.yml` prepare:rhachet hunk (file carried by #550)
- closes #512 and #665 too

### fix(node-service): lambda handlers (#640)
- `P/node-service/bad-practices/simple-lambda-handlers/src/**` — shared with #646

### fix(husky): prose in timestamp scope (#641)
- `P/husky/best-practice/.husky/check.timestamps.sh`, its play test and snapshot — shared with #681
- `.husky/check.timestamps.sh` (self-apply)

### fix(dates-and-times): uni-time package (#642)
- `P/dates-and-times/bad-practices/uni-time/package.json*`
- `P/dates-and-times/.declapract.integration.test.ts` (new) and snapshot, fixtures — shared with #662
- `A/dates-and-times/**`

### fix(logs): leveled log term (#643)
- `P/logs/bad-practices/leveled-term/**` (src and package.json test)
- `P/logs/src-markers*` test and snapshot — shared with #635
- `A/logs/**`

### fix(cache): cache directory options (#644)
- `P/cache/bad-practices/cache-directory-options/**`
- `P/cache/best-practice/.declapract.readme.md`

### fix(format): terraform formatter in format (#645)
- `P/format/**` (integration test, snapshot, new `package.json` + `.declapract.ts`, deleted unit test, `terraform-formatter/**`)
- `A/format/**`
- `P/terraform-common/best-practice/package.json` and its `.declapract.ts` (deleted)
- `.github/workflows/.test.yml` (self-apply, drops setup-terraform)
- `.test.yml` terraform hunk (file carried by #550)
- root `package.json` drops `fix:format:terraform` (file in infra)

### fix(node-service): simple lambda packages (#646)
- `P/node-service/best-practice/package.json`
- `P/node-service/bad-practices/simple-lambda-{client,handlers}/package.json.declapract.ts` and their tests
- `P/node-service/bad-practices/simple-lambda-handlers/` integration test, readme, snapshot — shared with #640
- `P/node-service/bad-practices/sdk-aws-lambda-pre-v07/.declapract.readme.md` — the 0.7.2 floor, and
  what to expect on it (`.foreman/verdict.0.7.2-cors-allow-headers.md`)
- **pr body, under the 0.7.2 floor bump, verbatim:** on sdk-aws-lambda >= 0.7.2, a cors-configured
  `forApiGateway` endpoint lists `x-trail-exid` in `Access-Control-Allow-Headers`. a test that pins
  the old list goes red; append `x-trail-exid`, or assert with `toContain`.

### fix(tests-node): jest testmatch (#647)
- `P/tests-node/best-practice/jest.*.config.ts` — shared with #679
- `P/tests-expo/best-practice/jest.*.config.ts` — shared with #679
- `P/tests-any/jest-testmatch*` test
- root `jest.*.config.ts` (ignore `/.agent/`)
- closes #665 too

### fix(practices): no bare issue ref or todo in a template (#648)
- `src/practiceTemplateIssueRefs*` test
- `P/artifact/best-practice/artifact.yml`; `P/typescript-node/best-practice/tsconfig.build.json`; `tsconfig.build.json` (root)
- `P/husky/best-practice/.husky/check.nvm.sh`; `.husky/check.nvm.sh`
- `P/provision-github/best-practice/**/resources.ts` — also carries the fail-closed visibility
  (S24, F109): `pkg.private === false ? 'public' : 'private'`, plus its clamp test
  `P/provision-github/github-repo-visibility.declapract.test.ts`
- the explicit-`private` backfill (S24, F110): `P/provision-github/bad-practices/implicit-package-privacy/package.json.declapract.ts`
  and its unit test; `P/provision-github/implicit-package-privacy.declapract.integration.test.ts`
  and its snapshot; fixture `P/provision-github/.test/assets/demo-repo-implicit-privacy/`;
  `P/provision-github/best-practice/.declapract.readme.md`
- not fixed here (F112): one apply on a repo without provision-github's deps writes the raw
  `@declapract{check.minVersion(...)}` into `devDependencies`. the cause is declapract's CONTAINS json
  fix, so it rides the extant reseed `.dream/v2026_10_14.reseed.declapract-contains-json-adds-raw-minversion-markers.md`
- `P/cicd-common/**/report-slow-tests.sh` and its test
- `.declastruct.yml` and `.deploy-expo.yml` todo hunks (files carried by #550)

### fix(lint): biome config (#649)
- `P/lint/best-practice/biome.jsonc` — shared with #630, #666
- `P/lint/biome.jsonc.declapract.integration.test.ts`

### fix(tests-service): acceptance via the endpoint (#650)
- `P/tests-service/best-practice/package.json`, readme, `*.acceptance.test.ts*` tests and snapshot
- `P/tests-service/bad-practices/simple-lambda-testing-methods/**`
- `P/tests-any/bad-practices/old-acceptance-test-utils{,-2,-3}/**`
- `U/asSourceOnRunLambdaEndpoint.ts`, its test and snapshot — no ancient pin; each 400 read in a
  moved file nests, http reads stay flat, a mixed file is marked (F39, on the 0.7.2 floor)
- `U/asSourceOnRunLambdaEndpoint.declapract.integration.test.ts` — the real-use clamp: a rewritten
  400 read against a real `forApiGateway` handler, green on 0.7.2, red on 0.7.1
- `package.json`, `pnpm-lock.yaml` — dev deps `sdk-aws-lambda@0.7.2` and `zod@4.4.3`, for that clamp
- `P/nonpublished-modules/bad-practices/ahbode-standard-lambda-handler/**`; `A/nonpublished-modules/**`

### fix(tests-node): keyrack in prepare (#651)
- no own files past `useKeyrack.ts` (#611) and `jest.*.prepare.ts` (#623)

### fix(persist-with-rds): declare pg client ssl (#652)
- `P/persist-with-rds/bad-practices/pg-client-without-ssl/**`
- `asDatabaseClientSsl*`, `rdsCaBundleUsEast1*`; `U/withPgClientSslDeclared.ts`
- `P/persist-with-rds/database-client*` test — shared with #664, #673

### fix(cicd-app-react-native-expo): expo commands (#653)
- no own files past the expo `package.json` (carried by #620)

### fix(runtime-schemas): zod pin reach (#654)
- no own files past `joi/**` (#548) and `zodVersionPinned.ts` (#545)

### fix(directory-structure-src): domain dir (#655)
- `P/directory-structure-src/bad-practices/domain-dir/**`
- `P/directory-structure-src/bad-practices/old-import-paths/**` — shared with #671
- `P/directory-structure-src/.declapract.integration.test.ts`, snapshot, fixtures
- `U/asBareDeprecatedDirSpecifierReplacement.ts`

### fix(config): simple caches and declared imports (#656)
- `P/config/best-practice/package.json` — carrier; shared with #637
- `src/practiceTemplateImportsDeclared*` test
- `P/config/best-practice/src/**/{getConfig.ts,getOneCacheDirectory.ts}` — shared with #690

### fix(tests-any): dev tool in dependencies (#657)
- `P/tests-any/bad-practices/dev-tool-in-dependencies/**`

### fix(config): schema superset (#658)
- `P/config/config-schema-superset*` test and snapshot
- `P/config/best-practice/**/config.schema.ts.declapract.ts`

### fix(persist-with-rds): repoint getDatabaseConnection (#659)
- `P/persist-with-rds/bad-practices/old-get-database-connection/**`
- `U/withGetDatabaseConnectionRepointed.ts`

### fix(typescript-any): no if-env, no ts-node beside esbuild-register (#660)
- `P/typescript-any/bad-practices/ts-node-beside-esbuild-register/**`
- `P/serverless/best-practice/package.json` if-env hunk (file carried by #668); `P/serverless/if-env-unfloored*` test
- `P/tests-node/bad-practices/deprecated-test-deps/**`
- `P/typescript-node/node-lts-strictest*`

### fix(config): hand-written config type (#661)
- `P/config/bad-practices/hand-written-config-type/**`, tests, snapshot, fixtures

### fix(dates-and-times): uni-time src (#662)
- `P/dates-and-times/bad-practices/uni-time/src/**`

### fix(bottleneck): bottleneck package (#663)
- `P/bottleneck/**` (`package.json.declapract.ts`, its test, new integration test and snapshot, `.test/assets`)
- `A/bottleneck/**`

### fix(persist-with-rds): engine upgrade (#664)
- `P/persist-with-rds/engine-upgrade*` test and snapshot, and its `.test/assets/demo-repo-on-a-prior-major` fixture
- `codegen.sql.*`, `build-image.dockerfile.declapract.ts`, `check-engine-skew.*`, `databaseClientTimeouts.ts`
- item 6 (`after_major_upgrade.sql`) does not ship: ahbode/infrastructure performs the major
  cutover and owns its post-upgrade ops (F105, `rule.forbid.copium`)
- extensions test and `.extensions.sql.declapract.ts`
- `src/snapshotsHostPathFree*` test

### fix(lint): depcheck restated (#665)
- no own files; served by the #647 / #639 files

### fix(lint): biome lint rules (#666)
- no own files past `biome.jsonc` (carried by #649)

### fix(rhachet): ignore rhachet output (#667)
- `P/rhachet/best-practice/.gitignore.declapract.ts`, its test and snapshot — shared with #688
- `.gitignore` (self-apply) — shared with #688

### fix(serverless): assure committed before deploy (#668)
- `P/serverless/best-practice/package.json` — carrier; shared (see table)

### fix(cicd-common): test evaluation job (#669)
- `.test.yml` evaluation hunk (file carried by #550)
- `src/workflowPrBuild*` test and snapshot — shared with #678

### fix(pnpm): below-floor patch key (#670)
- `P/node-service/bad-practices/sdk-aws-lambda-pre-v07/**`
- `U/getAllStalePatchKeys*` — shared with #680

### fix(directory-structure-src): old import paths (#671)
- no own files past `old-import-paths/**` (carried by #655)

### fix(practices): commands call declared bins (#672)
- `src/packageCommandsCallDeclaredBins*` test
- `P/artifact/best-practice/package.json`; new artifact `package.json` integration test, snapshot, fixture
- `A/artifact-only/**` (the declarations fixture for `artifact/package.json.declapract.integration.test.ts`, #672's clamp alone; foreman verdict)
- `P/conventional-commits/best-practice/package.json`; `P/persist-with-dynamodb/best-practice/package.json`
- npx-drop hunks in lint, serverless, typescript-expo, expo `package.json` (files carried elsewhere)

### fix(persist-with-rds): connection per mode (#673)
- `P/persist-with-rds/best-practice/**/getOneDatabaseConnection.ts` — shared with #652, #664

### fix(persist-with-rds): testdb per worktree (#674)
- `P/persist-with-rds/testdb-per-worktree*`, `P/tests-node/testdb-preflight-branches*` tests
- `P/persist-with-rds/best-practice/src/.test/assets/database/getTestdbIdentity.ts`, `.../getTestdbPort.ts` — test assets, never a prod path (S23, F106)
- `P/persist-with-rds/best-practice/src/utils/database/getOneDatabasePort.ts` — the prod read of a `TESTDB_PORT` override, honored only with test access; `getOneDatabaseConnection.ts` dials it (shared with #652, #664, #673)
- `P/persist-with-rds/getOneDatabasePort.declapract.test.ts` — the clamp on the test-access gate
- `P/persist-with-rds/best-practice/provision/schema/connection.config.js`, `provision/docker/testdb/compose.sh`, `docker-compose.yml` — require the testdb utils from `src/.test/assets/database/`
- `P/tests-node/best-practice/src/.test/assets/database/useTestdbPortOverride.ts` — the jest step that declares `TESTDB_PORT`
- `P/tests-node/best-practice/jest.integration.env.ts`, `jest.acceptance.env.ts` — call `useTestdbPortOverride()` (acceptance: under test access only)
- `P/tests-node/best-practice/src/.test/useWakeOfTestdb.ts` — probes `TESTDB_PORT`, else the declared port; shipped, so it stays in `src/.test/` (F108)
- `P/tests-node/testdb-port-override.declapract.integration.test.ts`
- `P/persist-with-dynamodb/__snapshots__/.declapract.integration.test.ts.snap` — resnap: the tests-node env template gained the override step; `-u` also pruned obsolete D39 entries no test produces

### fix(tests-node): acceptance env (#675)
- `P/tests-node/best-practice/jest.acceptance.env.ts`

### fix(cicd-app-react-native-expo): wait-on (#676)
- no own files past the expo `package.json` (#620) and metro set (#618)

### fix(cicd-common): pr build (#678)
- `src/workflowPrBuild*` test and snapshot — carrier; shared with #669

### fix(tests-any): test kind seam (#679)
- `P/tests-any/test-kind-seam*` test; `U/asTestKindPresenceCheck*`
- `P/tests-any/best-practice/src/**/*.integration.test.ts.declapract.ts`
- `P/tests-service/best-practice/**` blackbox declarations and `*.integration.test.ts.declapract.ts`

### fix(pnpm): stale patched dependency (#680)
- `P/pnpm/best-practice/package.json`, `package.json.declapract.ts`
- `P/pnpm/bad-practices/stale-patched-dependency/**`; repo-stale-patch fixture

### fix(husky): timestamp hook header (#681)
- no own files past `check.timestamps.sh` (carried by #641)

### fix(config): dev config to prep (#683)
- `P/persist-with-rds/.declapract.integration.test.ts`
- `old-dev-config-location` `dev.json` (config and rds)

### fix(husky): lock the timestamp hook, no exemption (#684)
- `P/husky/best-practice/.husky/check.timestamps.lock.sh`, its `.declapract.ts`, lock test, snapshot
- `demo-repo-with-edited-timestamp-hook`; husky `self-application` test
- `.husky/check.timestamps.lock.sh`; `.husky/pre-commit` (carrier; shared with #514)
- `.agent/repo=.this/role=any/briefs/rule.forbid.timestamp-hook-exemptions.md`
- `.agent/repo=.this/role=any/skills/husky.lock.restamp.sh`

### fix(cicd-service): rds jobs only in rds services (#685)
- `P/cicd-service/best-practice/.github/workflows/provision.yml.declapract.ts`
- `rds-jobs-in-non-rds-service` test, `.declapract.ts`, snapshot
- `provision.yml.merge*` test and snapshot
- `demo-repo-pre-oidc` fixture

### fix(persist-with-rds): forget terraform parameters (#686)
- `P/persist-with-rds/bad-practices/terraform-parameters/**`
- `P/persist-with-rds/best-practice/provision/aws/readme.md`

### fix(rhachet): ignore rhachet caches (#688)
- no own files past `.gitignore.declapract.ts` (carried by #667)

### fix(rhachet): boot.yml, rhachet 1.49.2 (#689)
- `P/rhachet/best-practice/package.json` — every floor at its npm latest: fireworksai 0.2.3,
  bhrain 0.40.0, bhuild 0.23.2, ehmpathy 1.39.5 (the rest already latest); `rhachet-brains-openrouter`
  0.1.3 added by default
  - snapshots resnapped for the new floors: `P/rhachet/` `.declapract.integration` and
    `self-link-build-order`, `P/cicd-app-react-native-expo/` `.declapract.integration`
  - `self-link-build-order` now applies three times: the first leaves openrouter's raw
    `@declapract{…}` marker (upstream declapract defect, F112), the second resolves it, the third
    is the no-op. the pr body says apply twice (the wisher's call: keep openrouter now)
- `P/rhachet/best-practice/.agent/**/boot.yml`, its `.declapract.ts`, tests, snapshots — denser, and
  timeless: no version gates, issue numbers, or prior-practice history in the comments
- `src/practiceTemplateTrailingNewline*` test

### fix(config): condense template prose (#690)
- `P/config/template-prose-condensed*` test
- `P/config/best-practice/.declapract.readme.md`

### issues served by another issue's files
- #512 → #639 · #519, #523, #539, #562 → #638 · #536 → #607 · #541 → #630 · #551 → #552/#553 ·
  #565 → #634 · #651 → #611/#623 · #653, #676 → #620 · #654 → #545/#548 · #665 → #647/#639 ·
  #666 → #649 · #671 → #655 · #681 → #641 · #688 → #667 · #612 → #611 · #629 → #548
- each still gets its own `closes #N` line in the pr body; #571 is an index, closed by comment.

### not planned (S18) — no `closes` line; close each as not planned, with a comment
- #585 — the key preflight job is dropped. a rejected key is the test suite author's to detect,
  or keyrack's to healthcheck, never a ci job's (`rule.forbid.key-health-checks-in-cicd`)
- #687 — the `provision.yml` paths gate is dropped: a hand-kept list that must track every
  adopter's plan inputs, to save a plan no cluster at min 0.5 pays for
  (`rule.forbid.overgranular-maintenance-farms`)

---

## .shared files

| path | carrier | also serves |
|---|---|---|
| `P/cicd-common/best-practice/.github/workflows/.test.yml` | #550 | #639, #645, #669 |
| `P/cicd-app-react-native-expo/best-practice/package.json` | #620 | #653, #672, #676 |
| `P/cicd-app-react-native-expo/.declapract.integration.test.ts` + snapshot | #624 | #608, #618, #619, #620, #676 |
| `P/cicd-app-react-native-expo/best-practice/.github/workflows/.deploy-expo.yml` | #550 | #619, #648 |
| `P/serverless/best-practice/package.json` | #668 | #553, #660, #672 |
| `P/serverless/.declapract.integration.test.ts` | #668 | #552, #553 |
| `P/tests-expo/.declapract.integration.test.ts` + snapshot | #619 | #621, #647, #679 |
| `P/typescript-expo/best-practice/package.json` | #619 | #672 |
| `P/lint/best-practice/package.json` | #601 | #616, #672 |
| `P/lint/best-practice/biome.jsonc` | #649 | #630, #666 |
| `P/config/best-practice/package.json` | #656 | #637 |
| `P/cache/.declapract.integration.test.ts` + snapshot | #625 | #644 |
| `P/runtime-schemas/bad-practices/joi/**` | #548 | #629, #654 |
| `P/runtime-schemas/best-practice/package.json.declapract.ts` + test | #545 | #624 |
| `P/persist-with-rds/best-practice/**/getOneDatabaseConnection.ts` | #673 | #652, #664 |
| `P/tests-node/best-practice/**/useKeyrack.ts` + test | #611 | #612, #651 |
| `U/asWorkflowMergedByJob.ts` + test | #608 | #685 |
| `U/getAllVersionsByPackageFromLockfile.ts` | #610 | #680 |
| `P/rhachet/best-practice/.gitignore.declapract.ts` + `.gitignore` | #667 | #688 |
| `.husky/pre-commit` | #684 | #514 |
| `P/husky/best-practice/.husky/check.timestamps.sh` | #641 | #681 |
| `package.json`, `pnpm-lock.yaml` (root) | infra | #645, #689 |

a shared file is listed once, under its carrier; the other issues it serves list the hunk in their
own sections.

---

## .infra

| path | reason |
|---|---|
| `package.json`, `pnpm-lock.yaml` | rhachet 1.49.2, brain bumps, openrouter, sdk-environment; tree-wide deps. `package.json` also declares `"private": false`: this repo stays public by its owner's explicit opt-in, so the fail-closed visibility and the privacy backfill leave it public (S24, F109, F110) |
| `.agent/keyrack.yml` | OPENROUTER_API_KEY for the review brain |
| `.agent/repo=.this/role=any/boot.yml` | say/ref reshape held under the 5,000 cap (F104), skill refs, budget dedupe (not-glob hunk serves #689) |
| `.agent/repo=.this/role=any/skills/declapract.validate.sh` | new repo skill for `test:validate` |
| `.route/v2026_10_02.package.install/**`, `.route/v2026_10_14.package.install/**` | install reasons for the dep bumps |
| `src/typecheckBestPracticeTemplates*` + snapshot, `A/typecheck-templates/**` | F88 typecheck clamp, no issue (seed S14) |
| `src/integrationApplyScopedOverRealSrc*`, `U/genTempRepoWithDeclarationsOutside.ts` | test write-through fix, no issue |
| `src/bestPracticeTemplateParse*` | #613 clamp extended to `.d.ts` (#613 is D0, closed) |
| `src/parsePackageJSONAdoption*`, `P/node/bad-practices/self-deps-not-link/package.json.declapract.ts` | asPackageJSON ratchet; self-deps-not-link leaves the allowlist |
| `src/__snapshots__/workflowCallerCalleeReconciliation*.snap` | cross-lane resnap |
| `src/ancientTargetPublished*` + snapshot, `src/stageAccessBridge*`, `P/cicd-service/acceptanceContempFleetGuard*` + snapshot | L10 "tier" to access reword, no issue |
| `U/{asObjectLiteralProps,asTemplateFingerprint,asWorkflowParts,getAllJsonDriftPaths,getAllWorkflowJobDrifts,getOneSourceScanEnd,isPackageImportedInRepo,isVersionBelowFloor,withEachCallRewritten,withReviewMarkerAbove}.ts` | cross-issue utils (`isPackageImportedInRepo` serves #642, #643, #663) |
| `U/migrateDevConfigToPrep.ts` | shared by #683 and #637 |
| `P/logs/.declapract.integration.test.ts` | `jest.setTimeout` raise under full load |
| `P/tests-any/bad-practices/old-acceptance-dir-location/**` (test, fixture, deleted declare.yml) | timeout bound raise to 480s |
| `A/tests-any-only/**` | fixture for the tests-any scoped runs |

infra rows close no issue; they ride the one commit with no `closes` line.

---

## .route

231 paths, not mapped per issue.

| top dir | paths |
|---|---|
| `.behavior/v2026_09_29.fix-absorb-recent-upgrade-reports/` | 193 |
| `.dream/` | 26 |
| `.agent/.actors/` + `.claude/settings.json` (moved into actors) | 12 |

---

## .placed (formerly unmapped)

every path the first pass left unmapped now has a home, each traced to evidence:

| path | lands in | evidence |
|---|---|---|
| `P/environments/bad-practices/old-dev-scripts/**` (6) | #607 | role-standards closure: a twice-applied + `executeApply` test per fix (yield, closures row); #607 is the fixed-point sweep |
| `P/git/.gitattributes.declapract.ts`, tests, snapshots, `repo-with-legacy-gitattributes` fixture (8) | #607 | the fix did not satisfy its own CONTAINS check (yield: "`.gitattributes` now satisfies its own CONTAINS check") — an apply that does not converge |
| `P/git/__snapshots__/.declapract.integration.test.ts.snap` | #607 | resnap that rides the `.gitattributes` fix |
| `P/package-json-order/**` (6) | #607 | role-standards closure, same as old-dev-scripts |
| `P/persist-with-rds/bad-practices/non-prefixed-manual-init-sqls/{readme.md → .declapract.readme.md}` | #607 | a bare `readme.md` under a bad-practice dir reads as a fixless declaration over a consumer's `readme.md`; a fixless check marks the file manual and blocks `apply` (#607's gate) |
| `P/persist-with-rds/empty-template-declares-zero-clusters*` | #637 | asserts `getAllParameters({ choice: null })` and names `ssm-param-names`, both from #637's `resources.ts` change |
| `P/tests-node/best-practice/jest.integration.env.db.ts` | infra (F88 clamp) | narrows a catch's `unknown` into `cause: Error` — a strictest-mode type fix the F88 typecheck clamp surfaced, not #674 |
| `P/tests-service/__snapshots__/{package.json.declapract.integration.test.ts,*.acceptance.test.ts.declapract.test.ts}.snap` | #650 | both drop `simple-lambda-testing-methods` / `invokeLambdaForTesting` |

the two placements once marked low confidence (config `variables.tf` → #630, `A/artifact-only/**`
→ #672) are confirmed by the foreman's verdict and sit in their issue sections above.
