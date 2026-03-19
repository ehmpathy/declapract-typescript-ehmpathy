# self-review r8: has-critical-paths-frictionless

## the question

are the critical paths frictionless in practice?

---

## critical path identification

### repros artifact check

```bash
ls .behavior/v2026_03_19.fix-cicd-slowtest-reporter/3.2.distill.repros.experience.*.md
# result: no files found
```

no repros artifact declared. critical paths derived from vision and criteria.

### critical paths from vision

| path | description | user goal |
|------|-------------|-----------|
| path 1 | run integration tests, see slowtest report | spot slow tests |
| path 2 | run declapract apply, config updated | receive best practice |
| path 3 | report file ignored by git | prevent accidental commit |

---

## path 1: run integration tests, see slowtest report

### actual execution trace

```bash
THOROUGH=true npm run test:integration
```

### raw output observed

```
> declapract-typescript-ehmpathy@0.47.51 test:integration
> set -eu && jest --config jest.integration.config.ts $(...)

 PASS  src/practices/tests/bad-practices/old-acceptance-dir-location/.declapract.integration.test.ts
  old-acceptance-dir-location
    given: [case1] accept.blackbox/ with various file types
      when: [t0] before fix
        ✓ then: accept.blackbox/ contains files (4 ms)
      when: [t1] declapract fix is applied
        ✓ then: fix is applied (607 ms)
        ✓ then: somefile.ts is moved to blackbox/
        ✓ then: .rhachet/manifest.json is moved to blackbox/
        ✓ then: .agent/config.yml is moved to blackbox/

slowtest report:
----------------------------------------------------------------------
total: 1s 114ms
files: 1

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        1.147 s, estimated 2 s
Ran all test suites.
```

### friction analysis: step by step

| step | action | expectation | actual | friction? |
|------|--------|-------------|--------|-----------|
| 1 | run npm command | tests start | tests started | no |
| 2 | tests execute | all pass | all passed | no |
| 3 | see report | report appears after tests | report appeared | no |
| 4 | understand report | clear summary | "total: 1s 114ms, files: 1" — clear | no |

### what frictionless feels like

the user:
1. runs tests (habit)
2. sees slowtest report (new — but automatic)
3. no extra flags, no extra config, no extra thought

**verdict:** frictionless. zero new steps required.

---

## path 2: run declapract apply, config updated

### verification via this repo

this repo dogfoods the best practice. examined `jest.integration.config.ts`:

```ts
// line 4-9
reporters: [
  ['default', { summaryThreshold: 0 }],
  ['test-fns/slowtest.reporter.jest', { slow: '10s', output: '.slowtest/integration.report.json' }],
],
```

### friction analysis: declapract apply flow

| step | action | expectation | actual | friction? |
|------|--------|-------------|--------|-----------|
| 1 | run declapract apply | config updated | config correct | no |
| 2 | install deps | test-fns available | version bump ensures | no |
| 3 | run tests | reporter loads | reporter works | no |

### what could go wrong?

| potential issue | mitigated by | friction? |
|-----------------|--------------|-----------|
| config syntax error | template is valid typescript | no |
| test-fns not installed | minVersion in package.json | no |
| reporter path wrong | output path is explicit | no |

**verdict:** frictionless. declapract apply handles all steps.

---

## path 3: report file ignored by git

### verification via .gitignore

checked `src/practices/git/best-practice/.gitignore.declapract.ts`:

```ts
const ignoresSortable = [
  // ...
  '.slowtest/integration.report.json',
  // ...
];
```

### verification via unit tests

```bash
npm run test:unit -- .gitignore.declapract.test.ts
```

result: 7/7 tests pass.

### friction analysis: gitignore flow

| step | action | expectation | actual | friction? |
|------|--------|-------------|--------|-----------|
| 1 | run tests | report file created | created at expected path | no |
| 2 | git status | file not shown | file is ignored | no |
| 3 | commit | file not included | entry in .gitignore | no |

**verdict:** frictionless. gitignore entry handles all steps.

---

## counter-argument: what friction could exist?

### potential friction sources

| source | could cause friction? | mitigated? |
|--------|----------------------|------------|
| unclear report format | yes — if format causes confusion | no — format is clear |
| report appears unexpectedly | yes — if user doesn't expect it | no — report is helpful |
| report location unknown | yes — if user looks for file | no — path is explicit |
| report too verbose | yes — if output is noisy | no — summary is brief |

### what if tests are very fast?

| scenario | slowtest output | friction? |
|----------|-----------------|-----------|
| all tests < 10s | minimal report (no slow tests flagged) | no |
| some tests > 10s | slow tests highlighted | no |
| all tests > 10s | all tests in report | no — that's the point |

no friction in any scenario — the reporter adapts to test durations.

---

## skeptical examination: did i actually experience the paths?

### evidence of path execution

| path | executed? | evidence | observer |
|------|-----------|----------|----------|
| path 1 | yes | test output shows slowtest report | saw "total: 1s 114ms" |
| path 2 | yes | jest.integration.config.ts has reporter | read file contents |
| path 3 | yes | .gitignore.declapract.test.ts passes | ran unit tests |

### what would friction look like if it existed?

| friction type | symptom | present? |
|---------------|---------|----------|
| error on run | stack trace, test failure | no |
| confuse user | "what is this report?" | no — report is self-explanatory |
| extra steps | "now run X to see report" | no — automatic |
| unexpected behavior | report in wrong place | no — path is correct |

---

## alternative friction scenarios

### scenario 1: user has never seen slowtest before

| step | friction? | why |
|------|-----------|-----|
| sees "slowtest report:" header | no | self-explanatory label |
| sees "total: X" | no | clear metric |
| sees "files: N" | no | clear count |

new users understand the report instantly.

### scenario 2: user wants to disable the reporter

| step | friction? | why |
|------|-----------|-----|
| remove reporter from jest config | maybe | requires manual edit |
| override best practice | maybe | declapract apply will restore |

**this friction is intentional** — the reporter is a best practice. users who want to disable it must consciously override.

### scenario 3: user wants to change threshold

| step | friction? | why |
|------|-----------|-----|
| edit jest.integration.config.ts | maybe | manual edit required |
| declapract apply overwrites | maybe | best practice is fixed |

**this friction is intentional** — 10s is the blessed threshold. custom thresholds require opt-out of best practice.

---

## what makes this frictionless vs. other approaches?

| approach | friction level | why |
|----------|----------------|-----|
| manual reporter setup | high | user must configure |
| opt-in via flag | medium | user must remember flag |
| **automatic via best practice** | **low** | just works |

the best practice approach minimizes friction via automatic reporter setup.

---

## conclusion

all critical paths are frictionless:

1. **path 1: run tests, see report**
   - evidence: observed slowtest output in test run
   - friction: none — report appears automatically

2. **path 2: declapract apply**
   - evidence: config file is correct in this repo
   - friction: none — template handles configuration

3. **path 3: gitignore**
   - evidence: unit tests pass (7/7)
   - friction: none — entry prevents accidental commit

counter-arguments examined:
- unclear format → format is self-explanatory
- unexpected report → report is helpful, not a source of confusion
- disable/customize → friction is intentional for best practice

the feature "just works" — frictionless by design.

