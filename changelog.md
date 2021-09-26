# Changelog

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
