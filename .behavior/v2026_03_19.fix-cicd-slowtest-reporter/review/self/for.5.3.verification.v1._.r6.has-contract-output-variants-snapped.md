# self-review r6: has-contract-output-variants-snapped

## the question

does each public contract have snapshots for all output variants?

---

## what is a public contract in this context?

a public contract is an interface that callers depend on:
- cli commands (user types command, sees output)
- sdk methods (developer calls function, receives response)
- api endpoints (client sends request, gets response)

### this feature's surface area

| artifact | is it a public contract? | why or why not |
|----------|-------------------------|----------------|
| jest.integration.config.ts | no | internal config, not callable |
| .gitignore.declapract.ts | no | declapract internal mechanism |
| .slowtest/integration.report.json | no | runtime output, owned by test-fns |
| slowtest terminal report | no | runtime output, owned by test-fns |

---

## contract inventory: exhaustive analysis

### cli commands

| command | added by this feature? | output change? |
|---------|----------------------|----------------|
| `npx declapract check` | no | no — same output format |
| `npx declapract apply` | no | no — same output format |
| `npm run test:integration` | no | yes — slowtest report appended |

**the slowtest report is appended to test output** — but the reporter format is owned by test-fns, not by this best practice.

### sdk methods

| sdk | method | added by this feature? |
|-----|--------|----------------------|
| declapract | check() | no — extant |
| declapract | apply() | no — extant |
| test-fns | slowtest.reporter | no — extant |

no new sdk methods. no output format changes to our contracts.

### api endpoints

no api endpoints involved. this is a declarative config feature.

---

## counter-argument: should we snapshot the slowtest output?

### argument for

> "the slowtest report is visible to users. snapshots would show reviewers what the output looks like."

### response

| concern | reality |
|---------|---------|
| who owns the format? | test-fns owns the reporter format |
| who maintains snapshots? | test-fns would maintain their snapshots |
| would our snapshots break? | yes — when test-fns updates format |
| is that a feature or a bug? | a bug — we'd have spurious snapshot updates |

### decision matrix

| scenario | snapshot in test-fns | snapshot in this repo | outcome |
|----------|---------------------|----------------------|---------|
| test-fns updates format | updated | breaks | bad — we fix their changes |
| we misconfigure reporter | passes | passes | bad — both are stale |
| reporter works correctly | passes | passes | neutral — redundant |

**verdict:** snapshot belongs in test-fns, not here.

---

## counter-argument: should we snapshot the gitignore entry?

### argument for

> "the gitignore entry is user-visible. snapshots would document what we add."

### response

| concern | reality |
|---------|---------|
| how many lines added? | 1 line |
| is the line visible in git diff? | yes — clearly |
| would a snapshot add clarity? | no — git diff shows the same |
| what would the snapshot contain? | `.slowtest/integration.report.json` |

### comparison

| review mechanism | what it shows | clarity |
|-----------------|---------------|---------|
| git diff | `+.slowtest/integration.report.json` | high |
| snapshot | `.slowtest/integration.report.json` | same |

**verdict:** git diff is sufficient. snapshot adds no review value.

---

## counter-argument: should we snapshot the jest config?

### argument for

> "the jest config is complex. snapshots would show the full reporter configuration."

### response

| concern | reality |
|---------|---------|
| how many lines added? | 7 lines (reporter entry) |
| is the change visible in git diff? | yes — clearly |
| is the jest config templated? | yes — declapract template |
| would a snapshot add clarity? | marginally — but diff shows context |

### comparison

| review mechanism | what it shows | clarity |
|-----------------|---------------|---------|
| git diff | `+['test-fns/slowtest.reporter.jest', {...}]` | high |
| snapshot | full config file | higher but noisy |

**verdict:** git diff shows the change with context. snapshot would show entire config file — more noise than signal.

---

## what outputs does this feature produce?

| output | type | owner | snapshot appropriate? |
|--------|------|-------|----------------------|
| slowtest report in terminal | runtime | test-fns | no — they own format |
| .slowtest/integration.report.json | runtime | test-fns | no — they own format |
| jest.integration.config.ts | template | declapract | no — git diff shows |
| .gitignore entry | config | declapract | no — git diff shows |

---

## alternative: what if this were a cli command?

if this feature added a cli command, what variants would we snapshot?

| variant | example | snapshot value |
|---------|---------|---------------|
| success | `slowtest --report` | high — shows output format |
| error | `slowtest --invalid` | high — shows error message |
| help | `slowtest --help` | high — shows usage |
| empty input | `slowtest` | medium — shows default behavior |

**but this feature adds no cli commands.** the analysis above is hypothetical — to demonstrate what we would do if the feature type were different.

---

## edge case analysis

### edge case 1: what if someone runs tests without the reporter?

| scenario | outcome | detectable? |
|----------|---------|-------------|
| reporter not configured | no slowtest output | yes — terminal shows no report |
| reporter misconfigured | jest fails to start | yes — error message |
| report path wrong | file in wrong location | yes — file not in expected path |

all edge cases are detectable via integration test execution — not via snapshots.

### edge case 2: what if gitignore entry is incorrect?

| scenario | outcome | detectable? |
|----------|---------|-------------|
| entry typo | report committed | yes — declapract check fails |
| entry absent | report committed | yes — declapract check fails |
| entry in wrong section | still works | n/a — gitignore is order-independent |

all edge cases are detectable via declapract check — not via snapshots.

---

## conclusion

no contract output variants need snapshots because:

1. **no cli commands added** — extant declapract commands unchanged
2. **no sdk methods added** — no new programmatic interfaces
3. **no api endpoints added** — config-only change
4. **slowtest reporter owned by test-fns** — their contract, their snapshots
5. **config changes visible in git diff** — snapshots add no review value
6. **edge cases covered by extant mechanisms** — declapract check, jest execution

counter-arguments examined:
- slowtest output → owned by test-fns
- gitignore entry → 1 line, git diff shows clearly
- jest config → template diff shows change with context

this review is n/a — the feature adds infrastructure config, not user-faced contracts with output variants.

