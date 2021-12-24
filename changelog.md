# Changelog

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
