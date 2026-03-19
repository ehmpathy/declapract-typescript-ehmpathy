# self-review r5: behavior-declaration-coverage

## second pass: declaration-to-implementation traceability

this review traces each declaration statement back to the exact line of code that fulfills it.

---

## vision → code traceability

### vision statement 1: "slowtest reporter in jest config"

**declaration:**
> add slowtest reporter to jest.integration.config.ts best practice

**implementation trace:**

| file | line | code |
|------|------|------|
| jest.integration.config.ts | reporters array | `['test-fns/slowtest.reporter.jest', { slow: '10s', output: '.slowtest/integration.report.json' }]` |

**verified by:**
- file read at execution time
- dogfood validation (ran `npm run test:integration`, saw terminal output)

### vision statement 2: "gitignore entry"

**declaration:**
> add .slowtest/integration.report.json to .gitignore best practice

**implementation trace:**

| file | line | code |
|------|------|------|
| .gitignore.declapract.ts | ignoresSortable array | `'.slowtest/integration.report.json',` |

**verified by:**
- file read at execution time
- test update (added to test input, tests pass)

### vision statement 3: "test-fns minVersion 1.15.7"

**declaration:**
> bump test-fns minVersion to 1.15.7

**implementation trace:**

| file | line | code |
|------|------|------|
| package.json (tests) | devDependencies | `"test-fns": "@declapract{check.minVersion('1.15.7')}"` |

**verified by:**
- file read at execution time
- dogfood validation (slowtest reporter works, which requires 1.15.7+)

---

## criteria → code traceability

### usecase.1: spot slow integration tests locally

| criterion | code location | evidence |
|-----------|---------------|----------|
| slowtest report in terminal | test-fns/slowtest.reporter.jest | reporter outputs to stdout |
| tree format with durations | test-fns reporter format | verified via dogfood run |
| visual indicator for slow tests | test-fns reporter format | verified via dogfood run |

### usecase.2: track slow tests over time

| criterion | code location | evidence |
|-----------|---------------|----------|
| json report written | `output: '.slowtest/integration.report.json'` | exact path in config |
| gitignore entry | ignoresSortable array | entry present, alphabetically sorted |

### usecase.3: receive reporter via declapract upgrade

| criterion | code location | evidence |
|-----------|---------------|----------|
| jest config includes reporter | jest.integration.config.ts template | will be applied on `npx declapract apply` |
| gitignore includes entry | .gitignore.declapract.ts | will be applied on `npx declapract apply` |

---

## blueprint → code traceability

### filediff tree verification

| blueprint says | actual change | match? |
|----------------|---------------|--------|
| `[~] jest.integration.config.ts` | reporters array expanded | yes |
| `[~] package.json` | test-fns version bumped | yes |
| `[~] .gitignore.declapract.ts` | ignoresSortable entry added | yes |

### codepath tree verification

| blueprint component | actual code | match? |
|---------------------|-------------|--------|
| `slow: '10s'` | `slow: '10s'` | exact |
| `output: '.slowtest/integration.report.json'` | `output: '.slowtest/integration.report.json'` | exact |
| ignoresSortable entry | `.slowtest/integration.report.json` in array | exact |
| test-fns minVersion 1.15.7 | `check.minVersion('1.15.7')` | exact |

---

## bonus item traceability

### human request: rhachet best practice

**declaration:**
> lets make that a default as part of the rhachet best practice

**interpretation:**
bump rhachet-brains-xai to 0.3.1 in rhachet best practice

**implementation trace:**

| file | line | code |
|------|------|------|
| src/practices/rhachet/best-practice/package.json | devDependencies | `"rhachet-brains-xai": "@declapract{check.minVersion('0.3.1')}"` |

**verified by:**
- file read at execution time
- follows extant version directive pattern

---

## gap analysis: what could have been missed?

### examined potential gaps

| potential gap | status | rationale |
|---------------|--------|-----------|
| unit test reporters | not applicable | vision specifies integration only |
| acceptance test reporters | not applicable | vision specifies integration only |
| configurable threshold | not implemented | vision specifies fixed 10s |
| multiple report formats | not implemented | vision specifies json only |

**all gaps are intentional** — they are out of scope per vision.

---

## declaration coverage score

| declaration source | total items | covered | score |
|--------------------|-------------|---------|-------|
| vision | 3 | 3 | 100% |
| criteria blackbox | 7 | 7 | 100% |
| blueprint filediff | 3 | 3 | 100% |
| blueprint codepath | 4 | 4 | 100% |
| bonus request | 1 | 1 | 100% |

**overall: 18/18 declarations covered (100%)**

---

## conclusion

every declaration from vision, criteria, and blueprint has implementation with exact code traceability. no gaps found. bonus request also fulfilled.

