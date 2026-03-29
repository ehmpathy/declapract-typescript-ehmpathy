# self-review r2: has-pruned-yagni

review for extras that were not prescribed.

## components traced to requirements

### component 1: delete use.apikeys.sh from cicd-common

**traces to**: wish line "delete legacy files", vision "what is awkward" section, criteria usecase.4 "use.apikeys files are removed"

**minimum viable**: yes, file deletion via bad-practice is standard declapract pattern.

**verdict**: required.

---

### component 2: delete use.apikeys.json from cicd-common

**traces to**: wish line "delete legacy files", criteria usecase.4 "use.apikeys files are removed"

**minimum viable**: yes.

**verdict**: required.

---

### component 3: update jest.integration.env.ts with keyrack.source()

**traces to**: wish handoff steps 3-4, vision "day-in-the-life: after", criteria usecase.1 "tests execute with credentials injected"

**minimum viable**: yes, direct replacement of apikeys pattern with keyrack.source().

**verdict**: required.

---

### component 4: update jest.acceptance.env.ts with keyrack.source()

**traces to**: wish handoff step 4, criteria usecase.2 "developer runs acceptance tests"

**minimum viable**: yes.

**verdict**: required.

---

### component 5: remove test:auth from package.json

**traces to**: wish handoff step 5, vision "declapract scope" table

**minimum viable**: yes.

**verdict**: required.

---

### component 6: create bad-practice for legacy file detection

**traces to**: criteria usecase.4 "declapract fix is run on repo with old pattern"

**minimum viable**: yes. declapract requires bad-practice to detect and fix legacy patterns.

**verdict**: required.

---

### component 7: readKeyrackConfig.ts utility

**traces to**: prod research pattern 5 "[REPLACE]", pattern 6 "[EXTEND]"

**question**: is a separate utility needed? could inline the yaml parse in each caller.

**analysis**: buildWorkflowSecretsBlock and .test.yml.declapract.ts both need to read keyrack config. shared utility prevents duplication.

**minimum viable**: yes. two callers justifies shared utility.

**verdict**: required.

---

### component 8: update buildWorkflowSecretsBlock.ts

**traces to**: vision "ci workflow" section, criteria usecase.3 "ci runs tests"

**minimum viable**: yes. ci needs secrets from keyrack.yml.

**verdict**: required.

---

### component 9: yaml package dependency

**question**: could we parse yaml without a package?

**analysis**: keyrack.yml is yaml format. regex parse would be fragile for yaml features (comments, multiline, anchors). yaml package is standard.

**minimum viable**: yes. proper yaml parse requires library.

**verdict**: required.

---

## yagni check: features not added

| hypothetical feature | why not added |
|---------------------|---------------|
| configurable keyrack.yml path | wish shows fixed path `.agent/keyrack.yml`. no requirement for custom paths. |
| support for env.prep/env.prod in jest env files | only env.test needed for test credentials per criteria. |
| migration procedure | declapract fix handles migration via bad-practice. no separate procedure needed. |
| backward compatibility shim | wish explicitly says delete legacy files, not maintain them. |
| keyrack.yml validation | keyrack.source() handles validation internally. no need to duplicate. |
| custom error messages | keyrack.source() provides error messages. no custom wrapper needed. |

---

## yagni check: abstractions not added

| hypothetical abstraction | why not added |
|-------------------------|---------------|
| KeyrackConfigReader class | simple function suffices. no class needed. |
| configuration factory | fixed config path, no factory needed. |
| strategy pattern for config sources | only one source (keyrack.yml). no strategy needed. |
| event hooks for credential injection | not requested. keyrack.source() is synchronous. |

---

## issues found and fixed

### issue 1: none

no YAGNI violations found. every component traces to wish, vision, or criteria.

---

## non-issues that hold

### non-issue 1: interface for env.prep/env.prod in KeyrackConfig

**why it holds**: interface declares `'env.prep'?: string[]` and `'env.prod'?: string[]` but blueprint doesn't use them. this is not YAGNI because:
1. the interface reflects actual keyrack.yml structure per wish
2. unused fields don't add code complexity
3. future use may need them (but we don't implement handlers)

**verdict**: interface completeness is ok. implementation only uses env.test.

### non-issue 2: try/catch around require()

**why it holds**: try/catch handles repos without rhachet installed. this is per vision open question "repos without rhachet". not extra functionality.

---

## summary

| category | count |
|----------|-------|
| components traced | 9 |
| features not added | 6 |
| abstractions not added | 4 |
| YAGNI violations | 0 |

blueprint contains minimum viable implementation. no extras found.

