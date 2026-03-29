# self-review r5: behavior-declaration-coverage

## deeper examination against blackbox criteria

### usecase.1 - developer runs integration tests

| criterion | satisfied? | how |
|-----------|------------|-----|
| keyrack unlocked + keys set: tests execute | yes | jest.integration.env.ts calls keyrack.source() |
| keyrack locked: error with unlock command | yes | keyrack.source() throws with exact command |
| keys absent: error with set commands | yes | keyrack.source() throws with exact commands |
| no keyrack.yml: tests execute normally | yes | existsSync check before keyrack.source() |

**verdict:** all criteria satisfied. keyrack.source() handles error messages internally.

### usecase.2 - developer runs acceptance tests

| criterion | satisfied? | how |
|-----------|------------|-----|
| same criteria as usecase.1 | yes | jest.acceptance.env.ts has same pattern |

**verdict:** all criteria satisfied.

### usecase.3 - ci runs tests

| criterion | satisfied? | how |
|-----------|------------|-----|
| env vars set: tests use them | yes | keyrack.source() checks process.env first |
| keyrack.yml exists + env vars set: env vars win | yes | keyrack behavior |
| prepare:rhachet runs before keyrack.source() | yes | added step to .test.yml |

**verdict:** all criteria satisfied.

### usecase.4 - declapract fix on old pattern

| criterion | satisfied? | how |
|-----------|------------|-----|
| use.apikeys files removed | yes | bad-practice old-use-apikeys with contents: null |
| jest.integration.env.ts updated | yes | best-practice template |
| jest.acceptance.env.ts updated | yes | best-practice template |
| test:auth removed | yes | best-practice package.json |
| test command no longer sources use.apikeys | yes | best-practice package.json |
| idempotent | yes | declapract check/fix semantics |

**verdict:** all criteria satisfied.

### usecase.5 - developer opens new terminal

| criterion | satisfied? | how |
|-----------|------------|-----|
| tests execute without re-unlock | yes | keyrack daemon behavior |

**verdict:** satisfied by keyrack, not by this behavior directly.

### edge cases

| criterion | satisfied? | how |
|-----------|------------|-----|
| all declared keys must be present | yes | keyrack.source({ mode: 'strict' }) |
| daemon not started: error prompts unlock | yes | keyrack behavior |

**verdict:** all edge cases satisfied.

## vision requirements check

| requirement | satisfied? |
|-------------|------------|
| once-per-workshift unlock | yes (keyrack daemon) |
| exact commands to fix issues | yes (keyrack error messages) |
| secure storage | yes (keyrack vault) |
| ci compatibility | yes (env vars precedence + prepare:rhachet) |

## summary

all 6 blueprint requirements implemented. all blackbox criteria satisfied. one gap found in r4 (prepare:rhachet step) was fixed.

tests verified: `npm run test:unit -- .test.yml` passes (14 tests)
