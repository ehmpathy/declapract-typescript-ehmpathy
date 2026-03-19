# self-review r5: has-contract-output-variants-snapped

## the question

does each public contract have snapshots for all output variants?

---

## contract inventory

### new or modified public contracts

| contract type | added? | modified? |
|---------------|--------|-----------|
| cli command | no | no |
| sdk method | no | no |
| api endpoint | no | no |
| best practice config | no (template) | yes |

### what this feature added

| file | type | contract? |
|------|------|-----------|
| jest.integration.config.ts | best practice template | no — not a callable contract |
| .gitignore.declapract.ts | best practice check/fix | no — declapract internal |
| package.json | version bump | no — dependency declaration |

---

## why no snapshots are needed

### 1. no cli commands added

this feature does not add any new commands. it adds config that declapract applies.

| command | before | after | output change? |
|---------|--------|-------|----------------|
| `npx declapract check` | extant | extant | no — same output format |
| `npx declapract apply` | extant | extant | no — same output format |

### 2. no sdk methods added

this feature does not expose any new programmatic interfaces.

| sdk | before | after | api change? |
|-----|--------|-------|-------------|
| declapract | extant | extant | no — config only |
| test-fns | extant | extant | no — version bump |

### 3. no api endpoints added

this is a declarative best practice config. no http endpoints are involved.

---

## snapshot coverage analysis

### extant snapshot coverage

| file | snapshots | purpose |
|------|-----------|---------|
| .gitignore.declapract.test.ts | no | unit test validates logic, not output format |

### should .gitignore have output snapshots?

| question | answer |
|----------|--------|
| is .gitignore a user-visible output? | no — it's a config file |
| does the user see .gitignore contents? | no — they see declapract check/fix results |
| would a snapshot help reviewers? | no — the test asserts correct behavior |

the declapract check/fix mechanism is the contract. the .gitignore content is implementation detail.

---

## what outputs does this feature produce?

| output | type | snapshot appropriate? |
|--------|------|----------------------|
| slowtest report in terminal | runtime output | no — test-fns owns this |
| .slowtest/integration.report.json | runtime artifact | no — test-fns owns this |
| jest.integration.config.ts | template file | no — declapract validates |
| .gitignore entry | config line | no — unit test validates |

### why test-fns owns the reporter output

the slowtest reporter format is defined by test-fns, not by this best practice. we consume test-fns — we don't define its output format.

```
test-fns → defines reporter output format
    ↓
jest.integration.config.ts → configures reporter
    ↓
terminal → displays reporter output
```

if the reporter output format changes, test-fns would update their tests.

---

## skeptical examination

### could snapshots help reviewers understand this feature?

| scenario | snapshot value |
|----------|---------------|
| reviewer wants to see slowtest report format | low — test-fns docs show this |
| reviewer wants to verify gitignore entry | low — entry is one line |
| reviewer wants to verify jest config | low — config diff shows change |

### what would snapshots capture?

| potential snapshot | value | verdict |
|--------------------|-------|---------|
| slowtest terminal output | owned by test-fns | skip |
| gitignore file contents | one line added | skip — git diff shows |
| jest config contents | template file | skip — git diff shows |

---

## conclusion

no new contract output variants to snapshot:

1. **no cli commands added** — extant declapract commands unchanged
2. **no sdk methods added** — no new programmatic interfaces
3. **no api endpoints added** — config-only change
4. **runtime output owned by test-fns** — not our contract to snapshot
5. **config changes visible in git diff** — snapshots add no review value

this review is n/a — the feature adds infrastructure config, not user-faced contracts.

