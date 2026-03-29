# self-review r6: has-behavior-declaration-coverage

review for coverage of the behavior declaration.

## vision requirements

### vision.declapract-scope (lines 102-111)

| requirement | blueprint coverage | status |
|-------------|-------------------|--------|
| tests: update jest.integration.env.ts | filediff: `[~] jest.integration.env.ts` + code example | ✓ |
| tests: update jest.acceptance.env.ts | filediff: `[~] jest.acceptance.env.ts` | ✓ |
| tests: update package.json remove test:auth | filediff: `[~] package.json` + code example | ✓ |
| cicd-common: delete use.apikeys.sh | filediff: `[-] use.apikeys.sh` and related | ✓ |
| cicd-common: delete use.apikeys.json | filediff: `[-] use.apikeys.json` and related | ✓ |

### vision.keyrack-source-call (lines 83-91)

| requirement | blueprint coverage | status |
|-------------|-------------------|--------|
| import { keyrack } from 'rhachet/keyrack' | code example line 90 | ✓ |
| keyrack.source({ env, owner, mode }) | code example lines 98-102 | ✓ |
| owner: 'ehmpath' | code example line 100 | ✓ |
| mode: 'strict' | code example line 101 | ✓ |

### vision.edge-cases (line 181)

| requirement | blueprint coverage | status |
|-------------|-------------------|--------|
| no keyrack.yml = no-op | existsSync check in code example lines 96-103 | ✓ |

---

## criteria requirements

### usecase.4 = declapract fix on repo with old pattern

| criterion | blueprint coverage | status |
|-----------|-------------------|--------|
| use.apikeys files are removed | bad-practice: fix returns { contents: null } | ✓ |
| jest.integration.env.ts updated | best-practice: filediff `[~]` + code | ✓ |
| jest.acceptance.env.ts updated | best-practice: filediff `[~]` | ✓ |
| package.json test:auth removed | best-practice: code example section 4 | ✓ |
| package.json test no longer sources | best-practice: code example section 4 | ✓ |

### usecase.1-3 = runtime behavior

| criterion | blueprint coverage | status |
|-----------|-------------------|--------|
| credentials injected | delegated to keyrack.source() | ✓ (out of scope) |
| locked error message | delegated to keyrack.source() | ✓ (out of scope) |
| absent keys error | delegated to keyrack.source() | ✓ (out of scope) |
| env vars precedence | delegated to keyrack.source() | ✓ (out of scope) |

note: runtime behavior is keyrack's responsibility, not declapract's. blueprint correctly delegates.

### usecase.5 = daemon persistence

| criterion | blueprint coverage | status |
|-----------|-------------------|--------|
| session persists across terminals | delegated to keyrack daemon | ✓ (out of scope) |

note: daemon behavior is keyrack's responsibility, not declapract's.

---

## issues found and fixed

none. all vision and criteria requirements are covered by the blueprint.

---

## summary

| category | count |
|----------|-------|
| vision requirements checked | 8 |
| criteria requirements checked | 10 |
| gaps found | 0 |
| gaps fixed | 0 |

the blueprint covers all requirements:
- declapract file changes (delete old, update jest env, update package.json)
- bad-practice for migration
- keyrack.source() integration
- existsSync guard for repos without keyrack.yml

runtime behaviors (unlock, set, daemon persistence) are correctly delegated to keyrack.source() which handles them internally.
