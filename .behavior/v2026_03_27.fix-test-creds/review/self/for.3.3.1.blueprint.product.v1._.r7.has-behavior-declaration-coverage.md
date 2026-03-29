# self-review r7: has-behavior-declaration-coverage

deeper review for coverage of the behavior declaration.

## vision requirements checked

### vision.declapract-scope (lines 102-111)

| requirement | blueprint section | line refs | status |
|-------------|------------------|-----------|--------|
| tests: update jest.integration.env.ts | filediff tree + code section 1 | 39, 84-104 | ✓ |
| tests: update jest.acceptance.env.ts | filediff tree | 40 | ✓ |
| tests: update package.json remove test:auth | filediff tree + code section 4 | 41, 184-192 | ✓ |
| cicd-common: delete use.apikeys.sh | filediff tree | 24-26 | ✓ |
| cicd-common: delete use.apikeys.json | filediff tree | 27-29 | ✓ |

### vision.keyrack-source-call (lines 83-91)

| requirement | blueprint section | line refs | status |
|-------------|------------------|-----------|--------|
| import { keyrack } from 'rhachet/keyrack' | code section 1 | 90 | ✓ |
| keyrack.source({ env: 'test' }) | code section 1 | 99 | ✓ |
| owner: 'ehmpath' | code section 1 | 100 | ✓ |
| mode: 'strict' | code section 1 | 101 | ✓ |

### vision.edge-cases (line 181)

| requirement | blueprint section | line refs | status |
|-------------|------------------|-----------|--------|
| no keyrack.yml = no-op | code section 1 | 96-103 | ✓ |

---

## criteria requirements checked

### usecase.4 = declapract fix on repo with old pattern

| criterion | blueprint section | evidence | status |
|-----------|------------------|----------|--------|
| use.apikeys files removed | bad-practice code | fix: { contents: null } | ✓ |
| jest.integration.env.ts updated | best-practice | filediff `[~]` + code | ✓ |
| jest.acceptance.env.ts updated | best-practice | filediff `[~]` | ✓ |
| package.json test:auth removed | best-practice | code section 4 | ✓ |
| package.json test no longer sources | best-practice | code section 4 | ✓ |

### usecase.3 = ci runs tests

| criterion | blueprint section | evidence | status |
|-----------|------------------|----------|--------|
| env vars set in ci workflow | buildWorkflowSecretsBlock | code section 3, lines 141-181 | ✓ (was gap, fixed) |

---

## issues found and fixed

### issue 1: incomplete buildWorkflowSecretsBlock code example

**found**: prior code section 3 showed only:
```typescript
const keyrackVarsJson = execSync('npx rhx keyrack get-vars --env test --json').toString('utf-8');
const keyrackVars = JSON.parse(keyrackVarsJson);
```

this was a fragment. the current buildWorkflowSecretsBlock.ts has 35 lines of logic:
- read apikeys from use.apikeys.json via readUseApikeysConfig
- build secrets block string
- inject into workflow template via regex

a two-line snippet doesn't show how the replacement preserves this behavior.

**fix applied**: expanded code section 3 (now lines 141-181) to show complete function:
- existsSync check for keyrack.yml (line 155-158)
- keyrack cli invocation (lines 160-162)
- early return if no vars (lines 165-167)
- secrets block build (lines 170-172)
- template injection via regex (lines 175-178)

the complete code section now at 40+ lines matches the complexity of the original.

**verification**: compared new code section 3 against current buildWorkflowSecretsBlock.ts:

| aspect | current | blueprint |
|--------|---------|-----------|
| config source | readUseApikeysConfig() | execSync keyrack cli |
| guard check | if (!apikeys.length) | if (!existsSync) + if (!keyrackVars.length) |
| secrets build | same .map().join() pattern | same |
| template injection | same regex | same |

the blueprint now fully replaces the current implementation.

---

## non-issues verified

### non-issue 1: keyrack.yml not created by declapract

**observed**: vision shows keyrack.yml format (lines 94-100) but blueprint doesn't create it.

**why it holds**: keyrack.yml is repo-specific configuration. declapract provides the jest env template that calls keyrack.source(). each repo creates their own keyrack.yml with their specific keys.

### non-issue 2: persist-with-dynamodb not mentioned

**observed**: vision line 112 says persist-with-dynamodb doesn't need changes.

**why it holds**: blueprint is for tests practice, not persist-with-dynamodb. that practice has no apikeys check to replace.

### non-issue 3: runtime behavior delegated

**observed**: criteria usecases 1-3 describe runtime behavior (locked, absent, env vars).

**why it holds**: these behaviors are keyrack.source() responsibility. blueprint correctly calls keyrack.source() which handles them internally.

---

## summary

| category | count |
|----------|-------|
| vision requirements checked | 10 |
| criteria requirements checked | 7 |
| gaps found | 1 |
| gaps fixed | 1 |
| non-issues verified | 3 |

found one gap: buildWorkflowSecretsBlock code example was incomplete. fixed by expand of code section 3 to show complete secrets block generation.
