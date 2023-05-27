# Changelog

## [0.22.8](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.22.7...v0.22.8) (2023-05-27)


### Bug Fixes

* **cicd:** upgrade node actions to use npm caching ([31c3c79](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/31c3c794ef0d211dafb08311f4cc3dd1f4b60f89))
* **lint:** add if-env package to the ignored dependencies ([734efa2](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/734efa2913b473ed3f400f54d7b1b3e28a1e9e98))

## [0.22.7](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.22.6...v0.22.7) (2023-05-25)


### Bug Fixes

* **cicd:** remove deploy-dev-on-main workflow w/ bad practice def ([0ef7480](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/0ef74807967e6415dced592965b34c7f2383cc00))

## [0.22.6](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.22.5...v0.22.6) (2023-05-25)


### Bug Fixes

* **deploy:** ensure that sls deployments have if-env dependency ([7638b46](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/7638b46296f35a5042e931b3a6b2e8328f8f54bb))
* **deploy:** exit with appropriate error code on deploy commands ([8a6d382](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/8a6d382a0fca10f2e3a930191d57c9beb7abbb80))

## [0.22.5](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.22.4...v0.22.5) (2023-05-25)


### Bug Fixes

* **order:** pin test:lint:deps and :eslint order in package.json ([6175ea1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/6175ea1aaf3c4fd2195699573bfdb8926310bddc))

## [0.22.4](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.22.3...v0.22.4) (2023-05-25)


### Bug Fixes

* **cicd:** drop old github actions workflows as bad practice ([b786956](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/b78695633c38eb05e6d85cadaaca72484b3e11ef))

## [0.22.3](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.22.2...v0.22.3) (2023-05-25)


### Bug Fixes

* **deploy:** ensure that package.json deploy script is not removed ([4ee1eb7](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/4ee1eb7ded7db328ef9342a56d9c08794cc037fe))

## [0.22.2](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.22.1...v0.22.2) (2023-05-24)


### Bug Fixes

* **cicd:** ensure terraform plan uses detailed exitcode in ghactions ([7f86b8d](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/7f86b8d4e86cb8c44b9347bfa8fef5bafa479eb4))
* **dynamodb:** remove dynamodb local endpoint from default test setup ([70d0127](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/70d0127811c408feda6175bf7df60f3158b156c4))
* **ts:** remove exact optional property types requirement ([83d28fb](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/83d28fbeac8c337d369b1ebbabbcc31ad6c500c7))

## [0.22.1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.22.0...v0.22.1) (2023-05-24)


### Bug Fixes

* **cicd:** ensure that plans output evaluated changes required correctly ([940b020](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/940b02081d9a1cd0130836c5de17489b7ba3d8f2))
* **rds:** ensure integration test directory prepared correctly ([7635360](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/763536037378a8f886cff0b3381366137bb93bd7))
* **rds:** remove old integration test directory bad practice ([7635360](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/763536037378a8f886cff0b3381366137bb93bd7))

## [0.22.0](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.21.2...v0.22.0) (2023-05-23)


### Features

* **cicd:** provision aws, github, sql-schema w/ gh-actions ([11cbc9d](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/11cbc9d472f462695b5bbf944fea27edad218461))
* **cicd:** speed up deployments by leveraging reusable parallelized test workflow ([11cbc9d](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/11cbc9d472f462695b5bbf944fea27edad218461))


### Bug Fixes

* **cicd:** dont duplicate test runs on deployments ([11cbc9d](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/11cbc9d472f462695b5bbf944fea27edad218461))
* **deps:** add flat to the deps of the pkg ([fd988cc](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/fd988cc27680f5d00e6b1d4fd95d39515c0bc3d0))
* **deps:** bump versions of deps to make more reliable ([334c4c1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/334c4c1ca358e5fe2c5d69ffd7458e737953a1dd))
* **rds:** ensure schema and types-from-sql generate run fix:format ([b9fda34](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/b9fda345303f2065b23a06bdcbac7311d57051d5))

## [0.21.2](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.21.1...v0.21.2) (2023-05-21)


### Bug Fixes

* **deps:** bump simple-lambda-testing-methods dep version ([1bf9eb7](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/1bf9eb70db313c8a507807f2bc1282bd1ecd76a1))
* **rds:** ensure docker integration test db is not blocked by other dbs ([73b612e](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/73b612ef5ae9661f10e1f1c42ac3b8d290f265e6))
* **utils:** enable withDatabaseConnection wrapper to optionally take in a dbConnection ([60de828](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/60de82895fbc827f9eeaa6a5db13ac4d5ab6e3ac))

## [0.21.1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.21.0...v0.21.1) (2023-03-03)


### Bug Fixes

* **tf-gh:** add linear-history branch protection rule to main branch ([c210de8](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/c210de8c3085bad0a7830237ba6e11f65b7d0d42))

## [0.21.0](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.14...v0.21.0) (2023-02-28)


### Features

* **dynamodb:** add dynamodb-dao-generator to dyanmodb peristance usecase ([79afdca](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/79afdcaca48aee2bf4de1fccf0b559f6baa39e78))


### Bug Fixes

* **cicd:** ensure the workspace name for packages is publish-on-tag ([983913d](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/983913ded65b7e7bf7a564d2faae1be714557b8c))
* **dynamodb:** ensure to provision integration-test-db correctly ([53f633d](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/53f633dd12ee4526f1836d3d8e31fcbdc38cee0f))
* **ts:** __test_utils__ directories should not be compiled in build ([787e39c](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/787e39c3445356aecdd5b79534b81888b360fc2f))

## [0.20.14](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.13...v0.20.14) (2023-02-17)


### Bug Fixes

* **deps:** bump min simple-artifact-builder version to avoid bug ([d443688](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/d443688c73be932e1d8536b48f80ef4ebfe2975d))

## [0.20.13](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.12...v0.20.13) (2023-02-16)


### Bug Fixes

* **deps:** bump min simple-artifact-builder version to rm sec vulns ([af0d809](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/af0d809358d65d3857bbb9c44701be69c17bccd7))
* **deps:** upgrade type-fns version to resolve sec vulns ([6b27dae](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/6b27daeac90c8541e579b5e88c2a8e10bf27fd51))
* **sorts:** add two linting subscripts to package-json-order practice ([dfe4960](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/dfe49603a05bde04adb5c30cbea5e118c09421dc))

## [0.20.12](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.11...v0.20.12) (2023-02-16)


### Bug Fixes

* **linting:** ensure typescript compiler does not try to lint for us ([c3dc190](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/c3dc1900ed0ac6265cc9a7d725fb092cdc8b4893))

## [0.20.11](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.10...v0.20.11) (2023-02-16)


### Bug Fixes

* **cicd:** ensure package-lock is in sync with package json ([ac1a6bf](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/ac1a6bfc25349cfda91e84fc078982c47563429a))

## [0.20.10](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.9...v0.20.10) (2023-02-16)


### Bug Fixes

* **deps:** bump declapract peer dep version minimum ([d8142a6](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/d8142a67e978383d2adf78b8fbda8c8ab5e2bff3))
* **rds:** remove syntax error in deploy.database.sh script ([7290cd9](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/7290cd916123b4fbb6daebeec6328dedb7b62c94))

## [0.20.9](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.8...v0.20.9) (2023-02-16)


### Bug Fixes

* **deps:** remove unused dependencies from generated best practice checks ([37e1a09](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/37e1a09134ffac5d2038a47f1e7b19eca608a3b3))

## [0.20.8](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.7...v0.20.8) (2023-02-13)


### Bug Fixes

* **rds:** ensure datalake user can be created; also, make sure cicd user pwd is automatically pulled in ([beef648](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/beef6488b53ff91e404bdec9dca40394776ab361))

## [0.20.7](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.6...v0.20.7) (2023-02-12)


### Bug Fixes

* **rds:** bump versions of sql-*-generators and sql-schema-control ([6c1d2e6](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/6c1d2e6024f39d989b122dc8685213870a41dcb1))

## [0.20.6](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.5...v0.20.6) (2023-02-12)


### Bug Fixes

* **testing:** remove --coverage flag from unit and integration tests ([f849b2a](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/f849b2a141d80157dcf8e69c90817aacf59ee0e0))

## [0.20.5](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.4...v0.20.5) (2023-02-12)


### Bug Fixes

* **linting:** ensure depchecks have all standard deps excluded and lint script syntax runs ([fa3752c](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/fa3752c1ca65f9dba4a07e9eb7b89452bf9f3373))

## [0.20.4](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.3...v0.20.4) (2023-02-12)


### Bug Fixes

* **deps:** make declapract a peer dependency ([de507d3](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/de507d30f732e0b0e7ab27f5a05b1535a078c7f2))

## [0.20.3](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.2...v0.20.3) (2023-02-12)


### Bug Fixes

* **deps:** add back lodash types in dev deps ([c44a735](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/c44a73590c8f4209b6e5939ccf1109a52259cd3d))

## [0.20.2](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.1...v0.20.2) (2023-02-10)


### Bug Fixes

* **cicd:** bump declapract version in order to compile ([4173b66](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/4173b6626ef6f41b6ba31d5bb2c1325df4e549bc))

## [0.20.1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.20.0...v0.20.1) (2023-02-10)


### Bug Fixes

* **deps:** bump declapract version to remove vulnerabilities ([875da72](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/875da72c2d86fd71c2e4bf53379f189677973a37))
* **npm-package:** ensure that npm packages are not marked as private ([b9806f8](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/b9806f84dd65731863fcb3e745a7fdea400b8a2a))
* **ts:** ensure packages emit type declarations in dist ([f71e2ad](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/f71e2adfb401a4a5a15bfa9e82e50043eadab4c5))

## [0.20.0](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.19.3...v0.20.0) (2023-02-10)


### Features

* **linting:** add depcheck to linting process ([5e34e0b](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/5e34e0b3a6ad7f6085ce91316c4a317ddbdb8f8c))

## [0.19.3](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.19.2...v0.19.3) (2023-02-10)


### Bug Fixes

* **cicd:** ensure tests are run with FORCE_COLOR for snapshot consistency ([c964068](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/c964068c68299b7cbc5db1c0a264f91cf9787014))
* **linting:** ensure to remove tslint package deps in badpractice too ([2a9eeb9](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/2a9eeb964854670e8fea5706560625ef60167f04))

## [0.19.2](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.19.1...v0.19.2) (2023-02-10)


### Bug Fixes

* **deps:** remove unneeded package dependencies ([89f3373](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/89f3373a936cef0a92449e1e72e3fdd09686a539))
* **linting:** add tslint bad practice ([5bf00a1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/5bf00a1c821b1309a99f844aab07f197abb502b5))

## [0.19.1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.19.0...v0.19.1) (2023-02-10)


### Bug Fixes

* **envs:** change DEPLOYMENT_STAGE envvar to just STAGE ([ed707be](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/ed707be6c5ac49f7451ab14110b4bef9a7ec3b47))
* **npm-packages:** split out environment vs environment-aws ([07b9ab1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/07b9ab15275cfc8223b12bf888564990d1dc46ff))
* **testing:** enable passing with no acceptance tests ([0c6d146](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/0c6d1462a093ea768f3af9e4cfa0ed5a9041bf00))

## [0.19.0](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.18.0...v0.19.0) (2023-02-10)


### Features

* **deps:** upgrade to using type-fns instead of simple-type-guards ([f0a1a80](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/f0a1a8037c0367a1777e4ab7c7a789701751ba2b))


### Bug Fixes

* **deps:** update packagelock post manual package.json update ([aef9510](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/aef95101417601c1f811740efe630a7ae41357f5))

## [0.18.0](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.17.8...v0.18.0) (2023-02-10)


### Features

* **uuid:** make it easier to import uuid util w/ deps.ts ([095cac6](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/095cac61320ee0455cf57589e9d9ba4ad74801a9))

## [0.17.8](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.17.7...v0.17.8) (2023-02-09)


### Bug Fixes

* **terraform:** ensure theres not a permadiff on product/variables.tf ([6e630f4](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/6e630f400cdd5a68d4b9895f0c0c6f8b70f52370))

## [0.17.7](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.17.6...v0.17.7) (2023-02-09)


### Bug Fixes

* **linting:** ensure that lines-between-class-members is off ([0c1a875](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/0c1a8751a2e504d4d366501628ea491a2e09fa5e))
* **testing:** dont attempt to transform js files with ts-jest ([b980fd6](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/b980fd6905c2284b139337f18536201e6acc1e9d))

## [0.17.6](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.17.5...v0.17.6) (2023-02-09)


### Bug Fixes

* **testing:** ensure that ts-node is installed for jest.config.ts support ([2df98ee](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/2df98ee7fd6c23a640a3a598033e986118e4fbf9))

## [0.17.5](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.17.4...v0.17.5) (2023-02-09)


### Bug Fixes

* **rds:** ensure packagejson scripts reference new docker integration-test-db location ([7f01772](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/7f0177275a9c3ad0b88430d48fd1fbe17b3c95d7))

## [0.17.4](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.17.3...v0.17.4) (2023-02-05)


### Bug Fixes

* **deps:** bump simple-artifact-builder version ([ad4800d](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/ad4800d4ab6277507f91c3621be5a8a1726ab024))
* **deps:** ensure uuid is v9 and old module name is a bad practice ([15ed76e](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/15ed76ea9edcf290f831f2a141b314d767ece532))

## [0.17.3](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.17.2...v0.17.3) (2022-12-27)


### Bug Fixes

* **usecases:** ensure testing and artifact usecases are exposed for lambda-service-with-rds ([39fa430](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/39fa43028a96f8b6373da5cedd8dd006b49db63c))

## [0.17.2](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.17.1...v0.17.2) (2022-12-23)


### Bug Fixes

* **artifact:** bump simple-artifact-builder version to avoid node fs.rmdir dep warning ([c45cac9](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/c45cac94496403334131b0f6c0f6eb87ebc79d03))
* **packages:** add node registry url to packages to ensure they are publishable ([7bbcb87](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/7bbcb8776ea00e334d083a5f00ad152336a2fa50))

## [0.17.1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.17.0...v0.17.1) (2022-12-21)


### Bug Fixes

* **jest:** upgrade jest config fix its relationship to tsconfig ([d7f73fe](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/d7f73fe67ce5b8d41cd1496386f9a8b3ba42ed13))

## [0.17.0](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.16.0...v0.17.0) (2022-12-19)


### Features

* **artifacts:** use simple-artifact-builder to create deployment artifact ([#25](https://github.com/ehmpathy/declapract-typescript-ehmpathy/issues/25)) ([b880f1d](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/b880f1dedef4c0a0cd152a46328d5534b5a0ba52))
* **dynamodb:** support docker provisioned dynamodb local for test env ([#28](https://github.com/ehmpathy/declapract-typescript-ehmpathy/issues/28)) ([01a96f5](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/01a96f591022e5e365fac575a68887250b4dfd3b))


### Bug Fixes

* **cicd:** fix deployment by upgrading publish-on-tag workflow ([51198d0](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/51198d0dc8d35d31810e6c0f740d62057a5bf10e))

## [0.16.0](https://github.com/ehmpathy/declapract-typescript-ehmpathy/compare/v0.15.0...v0.16.0) (2022-12-19)


### Features

* **cicd:** upgrade to using the more stable v3 of please-release plugin ([3a37c77](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/3a37c773b490aa71455157aac3552ed795eca4fa))
* **jest:** upgrade jest deps to latest ([2eeeea0](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/2eeeea0d344161ae19d215cea162e53849c58a4c))
* **s3:** support service-scoped s3 namespace and permissions ([886a869](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/886a8694ba39e1dbcaf81e72d339d91ede3c69b3))
* **typescript:** upgrade typescript version and config ([fbf2152](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/fbf21521e13b43fc91bcd90c349653f2afd80b68))
* **usecases:** expose the npm-package and typescript-project usecases ([70e37d2](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/70e37d244dc5c2b408be9878b4a113c17fa62498))


### Bug Fixes

* **cicd:** define test:commit and test:integration ([d033b05](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/d033b0501b5c8dc4fb7f4bd1c8e40088120ec3ad))
* **cicd:** ensure release message has sufficient whitespace ([98fb896](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/98fb8967f37cb895249c3ffce9f884b6370a9063))
* **cicd:** remove some service specific things from test-on-commit workflow ([04f8fcd](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/04f8fcd0b8cc4945cbaa594a2ffdd81d015a9b03))
* **cicd:** update packagelock to unblock cicd ([937ca17](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/937ca1706187ac7e1fd7f422dddf9da7ff3bc8ba))
* **commitlint:** allow headerlength to expand to 140 ([bbd178f](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/bbd178ff7c222e9529b5b07ec9e84bb34c57871e))
* **deps:** drop uuidv4, use uuid instead; community converged ([a50f527](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/a50f527fd5220f061f421b6aae9d5613baf9889d))
* **eslint:** upgrade eslint deps to latest ([5e82cf7](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/5e82cf73c10285b616c297417eae69799248ce3f))
* **pkg:** change pkg name to suffix with org name ([cbb0f16](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/cbb0f1652346047ad76e02612a2785583c7d1695))
* **readme:** add a quick description of declapract to top of readme ([13be5b8](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/13be5b84001846f53fc204331bb563935c713839))
* **refs:** replace uladkasach repo refs to ehmpathy repo refs ([9f104f4](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/9f104f4b11fbf4707d6521dae674f5570d4cbd89))
* **test:** fix failing unit test after name change ([1ce766e](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/1ce766e384618a1269251ac2e47a8f8d45d048e0))
* **tests:** resolve linting issues that were blocking tests ([9e1bdc4](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/9e1bdc40d09b24691500442b487f55c873a13727))
* **tf:** bump tf version to 3.74.3 ([9950081](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/9950081b241e119c8adab93c2eb9cc85ab11485c))
* **typescript:** remove the noPropertyAccessFromIndexSignature method ([a4083c1](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/a4083c183c6e4f55456120521cd8b2e3f1518fff))
* **typescript:** set importsNotUsedAsValues to false due to preference ([6ed623e](https://github.com/ehmpathy/declapract-typescript-ehmpathy/commit/6ed623e1bf2f91d2cbd75d235bcfd539008781cd))

## [0.15.0](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.14.2...v0.15.0) (2022-03-01)


### Features

* **cicd:** cancel running ci jobs when pr is updated ([90a6848](https://www.github.com/uladkasach/best-practices-typescript/commit/90a6848c8ebd0d7084981eb0c647e5f937d46fcd))


### Bug Fixes

* **deps:** upgrade min ver of simple-lambda-testing-methods to 0.2.1 ([3f10be4](https://www.github.com/uladkasach/best-practices-typescript/commit/3f10be456678c80c266b24f6939aaa5e434113fe))
* **tests:** ensure local acceptance tests are verbose and run in band ([253f334](https://www.github.com/uladkasach/best-practices-typescript/commit/253f334e7554e2f4e53eaafb7c91346623d02e08))
* **tsc:** remove exclusion of .declapract dir from tsc ([4f70c7d](https://www.github.com/uladkasach/best-practices-typescript/commit/4f70c7d2a5bab10cd8d4fbf76e2fd4e1729bc91f))

### [0.14.2](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.14.1...v0.14.2) (2022-01-21)


### Bug Fixes

* **github:** ensure that we use github tf provider 4.19.1 for auto-merge support ([ca6db9a](https://www.github.com/uladkasach/best-practices-typescript/commit/ca6db9ad097baa5290f73f049c0c3089f32302f0))

### [0.14.1](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.14.0...v0.14.1) (2022-01-18)


### Bug Fixes

* **deps:** bump min version of simple-type-guards ([8bb0b29](https://www.github.com/uladkasach/best-practices-typescript/commit/8bb0b29e7d682f68c32efbd48aa1ab45f9e0af03))
* **github:** enable repos to automerge prs ([53606b9](https://www.github.com/uladkasach/best-practices-typescript/commit/53606b90a3d94ff68e9726112770b92899aa361e))
* **sls:** ensure services have perms to read/write their namespaced sqs queues, dynamodb tables, and sns topics ([2e0ada3](https://www.github.com/uladkasach/best-practices-typescript/commit/2e0ada30f58c170b3eda507b68cc05e75ba98be7))

## [0.14.0](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.13.0...v0.14.0) (2021-12-29)


### Features

* **errors:** add unexpected code path error util ([f250aa0](https://www.github.com/uladkasach/best-practices-typescript/commit/f250aa0d80837d8fcebb47c1df0d475b4c7c77e4))

## [0.13.0](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.12.1...v0.13.0) (2021-12-29)


### Features

* **cicd:** improve speed of cicd by leveraging setup-node ~/.npm caching ([b299b2e](https://www.github.com/uladkasach/best-practices-typescript/commit/b299b2e4e517faea2d8804653f44ab5e1fd826c6))

### [0.12.1](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.12.0...v0.12.1) (2021-12-21)


### Bug Fixes

* **cicd:** remove custom github runners feature, for better consistency ([98e20bf](https://www.github.com/uladkasach/best-practices-typescript/commit/98e20bfcdce1c0d5d47a26a254d7a94c7a09c774))

## [0.12.0](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.11.1...v0.12.0) (2021-12-21)


### Features

* **cicd:** enable specifying a custom github actions runner ([aea0fb8](https://www.github.com/uladkasach/best-practices-typescript/commit/aea0fb874943c478a400c717b6d5f8955f26fa93))


### Bug Fixes

* **db-query:** add additional observability to errors thrown while querying db ([3a193e5](https://www.github.com/uladkasach/best-practices-typescript/commit/3a193e5c91ff0dfc83ecad4f792e854b4eae543a))
* **deps:** bump deps ([95b6b8a](https://www.github.com/uladkasach/best-practices-typescript/commit/95b6b8aa679723827688392a5dd5932d89673755))
* **deps:** bump min version of sql-code-generator ([03d7bc7](https://www.github.com/uladkasach/best-practices-typescript/commit/03d7bc75658ed7060b72f70982cf444727477a83))
* **logger:** bump best version of logger, to fix logs in aws-lambda env ([8d2700c](https://www.github.com/uladkasach/best-practices-typescript/commit/8d2700c389dc0757d24351933141fb196cb8ca63))

### [0.11.1](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.11.0...v0.11.1) (2021-12-04)


### Bug Fixes

* **comments:** update comments in the test env files for readability ([1e59061](https://www.github.com/uladkasach/best-practices-typescript/commit/1e59061f46a5cc4f2ba2a2be5963191409cca48e))
* **dep:** bump min version required of simple-lambda-testing-handler ([a298a34](https://www.github.com/uladkasach/best-practices-typescript/commit/a298a3406240ed77d7b1344f63cbf0c1b4da5b4c))
* **uuid:** ensure that the uuid bad practice catches cases more generally ([759e713](https://www.github.com/uladkasach/best-practices-typescript/commit/759e71381fe6841bb54826f29e81ff9b375bed7e))
* **uuid:** fix uuid bad-practices declaration name ([0913821](https://www.github.com/uladkasach/best-practices-typescript/commit/091382160e988f72ea6ff1b38dcd66c5b8f29711))

## [0.11.0](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.10.6...v0.11.0) (2021-12-04)


### Features

* **usecases:** support the nextjs web app use case ([4351a38](https://www.github.com/uladkasach/best-practices-typescript/commit/4351a389e940176416162c72494aed0fb15df162))


### Bug Fixes

* **env:** SERVERLESS_STAGE -> DEPLOYMENT_ENV ([b6f9b33](https://www.github.com/uladkasach/best-practices-typescript/commit/b6f9b3373cbde5dde9b4dc9e01f595aab24e196b))
* **sls:** be more explicit with the sls deploy flags ([f1f7ddb](https://www.github.com/uladkasach/best-practices-typescript/commit/f1f7ddb2b9a1df2f764eb3580c1982d9e4d04c9f))
* **tests:** allow user to say I_KNOW_WHAT_IM_DOING to run int tests in other envs ([e62bb3a](https://www.github.com/uladkasach/best-practices-typescript/commit/e62bb3ab819503d6efccc9b03fe1d6302e023433))
* **tests:** update test env setup files for stage safety and lint ignores ([84e12ac](https://www.github.com/uladkasach/best-practices-typescript/commit/84e12acb48ffaa4ca78bcffb1a5fe13ab08979c1))
* **uuid:** ensure uuidv4 package is used ([ed91b8e](https://www.github.com/uladkasach/best-practices-typescript/commit/ed91b8ef81632aee945f06e1acec406836800d9d))

### [0.10.6](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.10.5...v0.10.6) (2021-10-15)


### Bug Fixes

* **cicd:** ensure that github actions test and deploy with node version specified in nvmrc ([d527475](https://www.github.com/uladkasach/best-practices-typescript/commit/d527475409a4777fd2b8b77287529b8f08c26739))

### [0.10.5](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.10.4...v0.10.5) (2021-10-14)


### Bug Fixes

* **commits:** ensure test:commits handles case where no tags have been created yet ([2a04dac](https://www.github.com/uladkasach/best-practices-typescript/commit/2a04dac9f02b45ebcbd6bcb39d5d02eba8e64662))
* improve typing on withDatabaseTransaction; remove soon to be deprecated -v flag for sls deploy ([af7567b](https://www.github.com/uladkasach/best-practices-typescript/commit/af7567be2ac2614457d30532598fd6ff4054f8cf))

### [0.10.4](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.10.3...v0.10.4) (2021-10-02)


### Bug Fixes

* **config:** ensure aws  parameterstore namespace uses tf local.service name variable instead of hardcoding ([b99695c](https://www.github.com/uladkasach/best-practices-typescript/commit/b99695c8d80eaa2c3050c4983e6aa980e87a6dd3))
* **config:** fix parameter store namespace defiend in tf ([223bdcb](https://www.github.com/uladkasach/best-practices-typescript/commit/223bdcb539e19594877bf4d729ad3a88654050ff))

### [0.10.3](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.10.2...v0.10.3) (2021-09-26)


### Bug Fixes

* **testing:** add fix to another variant of old acceptance test utils ([ff9b0fb](https://www.github.com/uladkasach/best-practices-typescript/commit/ff9b0fbb162c0daba28d9d87360290aeb3ad66c4))

### [0.10.2](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.10.1...v0.10.2) (2021-09-26)


### Bug Fixes

* **config:** add checks and fixes for using old config path ([f09e818](https://www.github.com/uladkasach/best-practices-typescript/commit/f09e818b4e4128607ad125bd7e14a0061ff8e6f8))
* **sls:** improve sls.yml fix ([f2607d3](https://www.github.com/uladkasach/best-practices-typescript/commit/f2607d32a435a8b01c5df8e17c16ecb3ea7a7672))
* **sls:** revert sls wildcard resource format change ([b84a830](https://www.github.com/uladkasach/best-practices-typescript/commit/b84a830c517d58a84d672ddf5df2d69e5f63aca7))

### [0.10.1](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.10.0...v0.10.1) (2021-09-23)


### Bug Fixes

* **ci:** ensure that we throw an error if tf detects a change required for github repo ([8c5e97f](https://www.github.com/uladkasach/best-practices-typescript/commit/8c5e97fb2a581f3c55c2f592dbfa7dd44bc86e9f))
* **eslint:** remove typo from eslint config ([7a3f9af](https://www.github.com/uladkasach/best-practices-typescript/commit/7a3f9afb412c07429026ea3615601849ffab81e1))
* **sls:** improve comments and remove redundant quotes ([f039fa2](https://www.github.com/uladkasach/best-practices-typescript/commit/f039fa214b06393aba986ae6b8e9a4337437caa6))
* **terraform:** ensure github tf provider is pinned to minor viersion ([14526d0](https://www.github.com/uladkasach/best-practices-typescript/commit/14526d019f3ca93f19e8f4b9fa4317777c2fc778))
* **testing:** detect and fix another acceptance test bad practice ([c2c6c20](https://www.github.com/uladkasach/best-practices-typescript/commit/c2c6c203b129ba504ca3f98803cb27832fbf10a2))

## [0.10.0](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.9.0...v0.10.0) (2021-09-22)


### Features

* **github:** add github provisions ([fe3ec20](https://www.github.com/uladkasach/best-practices-typescript/commit/fe3ec2030cd224195ecb777abe0ced56afcd795e))
* **rds:** add provision:schema:sync command to persist-with-rds practice scripts ([382e7d3](https://www.github.com/uladkasach/best-practices-typescript/commit/382e7d342af8f6cdf803438961e6b1ac66abc248))


### Bug Fixes

* formatting ([599c50d](https://www.github.com/uladkasach/best-practices-typescript/commit/599c50dc67d755bf5aafd245bb5348d1946dd532))

## [0.9.0](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.8.0...v0.9.0) (2021-09-21)


### Features

* **nonpublished-modules:** autofix common deprecated nonpublished modules (standard-lambda-handlers, deep-omit) ([6fa8935](https://www.github.com/uladkasach/best-practices-typescript/commit/6fa89358212184cb3450a4a0f058de274b9fc073))
* **prettier:** auto sort imports w/ prettier ([e94554e](https://www.github.com/uladkasach/best-practices-typescript/commit/e94554e631cb04f0bc3e6a022573b2742049e35d))


### Bug Fixes

* **bad-practice:** fix the deep-omit nonpublished module badpractice autofix ([4aeb1e4](https://www.github.com/uladkasach/best-practices-typescript/commit/4aeb1e444fa99a047f36b063ae495f6f8ea03380))
* **ci:** ensure that test:types will not fail on declaration file errors, since we expect missing imports there ([0c3138b](https://www.github.com/uladkasach/best-practices-typescript/commit/0c3138bc6385a1a6585592e46151057f8e068761))
* **config:** sort imports in practice config ([f7aaa34](https://www.github.com/uladkasach/best-practices-typescript/commit/f7aaa34ccb57a018e63829f5bd100f9d5e15478c))
* **domain:** bump domain-objects version ([597708a](https://www.github.com/uladkasach/best-practices-typescript/commit/597708ab22b3de728bac5b8fefb0d00d3f561820))
* **formatting:** use prettier import sort in defs to make sure all best practices have correct formatting ([ef25ae0](https://www.github.com/uladkasach/best-practices-typescript/commit/ef25ae094ee85f0a410d3e0f792cb3e3a5798873))

## [0.8.0](https://www.github.com/uladkasach/best-practices-typescript/compare/v0.7.0...v0.8.0) (2021-09-20)


### Features

* **fmt:** add terraform format; improve some more existing checks and fixes ([fa14120](https://www.github.com/uladkasach/best-practices-typescript/commit/fa141205abd390e8d4eb26472e542f3140985b63))
* **runtime-type-checking:** autofix old joi .valid format ([fb1a25d](https://www.github.com/uladkasach/best-practices-typescript/commit/fb1a25dbca4c23831d4a7b40e9d7cad60712a5aa))
