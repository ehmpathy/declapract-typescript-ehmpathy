# self-review r3: has-questioned-assumptions

third pass with deep code read. verified each assumption against actual implementation.

## assumptions surfaced (code-verified)

### assumption 1: workflow file architecture

**what we assumed**: blueprint shows one workflow file `.test.yml.declapract.ts` needs update.

**evidence from code**: there are TWO different files:
- `.test.yml.declapract.ts` — reusable workflow definition, has own `buildExpectedContent()` function, reads readUseApikeysConfig directly
- `test.yml.declapract.ts` — main workflow caller, uses shared `buildWorkflowSecretsBlock()` utility

plus deploy.yml.declapract.ts and publish.yml.declapract.ts also use buildWorkflowSecretsBlock.

**what i verified**:
- `.test.yml.declapract.ts` (lines 56-64) reads readUseApikeysConfig and extracts `.apikeys?.required`
- `test.yml.declapract.ts` (lines 17-20) calls buildWorkflowSecretsBlock
- buildWorkflowSecretsBlock (lines 12-15) reads readUseApikeysConfig and extracts `.apikeys?.required`

**verdict**: blueprint codepath is correct. update to buildWorkflowSecretsBlock affects test.yml, deploy.yml, publish.yml automatically. update to .test.yml.declapract.ts separately covers the reusable workflow definition.

---

### assumption 2: buildExpectedContent interface unchanged

**what we assumed**: blueprint says extend .test.yml.declapract.ts to use keyrack config.

**evidence from code**: buildExpectedContent signature (line 9-12):
```typescript
export const buildExpectedContent = (input: {
  template: string;
  apikeys: string[];
}): string => {
```

it takes `apikeys: string[]` directly, not a keyrack config object.

**interface change required**: the extraction from keyrack config happens at call site in check/fix functions. buildExpectedContent can stay unchanged — just pass `config['env.test'] ?? []` instead of `config?.apikeys?.required ?? []`.

**verdict**: holds. interface change is minimal — extraction logic moves to caller.

---

### assumption 3: apikeys vs keyrack key extraction

**what we assumed**: blueprint shows extraction as `config['env.test']`.

**evidence from code**: current extraction is `config?.apikeys?.required ?? []` (line 15, 63, 100).

**keyrack equivalent**: `config?.['env.test'] ?? []`

**verified parse behavior**: yaml `env.test:` parses as `{ 'env.test': [...] }` not nested object.

**verdict**: holds. extraction pattern changes but callers handle empty array correctly per line 16-20 of buildExpectedContent.

---

### assumption 4: jest env files use require() for json

**what we assumed**: blueprint shows `require('rhachet/keyrack')` for sync import.

**evidence from code**: jest.integration.env.ts line 99:
```typescript
const config = require(apikeysConfigPath);
```

this is require of a json file path, not an npm package. blueprint uses require of npm package.

**difference**:
- `require('/path/to/file.json')` — resolves file path
- `require('rhachet/keyrack')` — resolves npm package

**what could fail**: if rhachet not in node_modules, require throws at parse time not runtime.

**mitigation verified**: blueprint wraps in try/catch which handles absent package.

**verdict**: holds. try/catch handles absent rhachet.

---

### assumption 5: keyrack.source() error format compatible

**what we assumed**: keyrack.source() errors replace manual apikeys error.

**evidence from code**: current error format (lines 104-118 of jest.integration.env.ts):
```
⛈️  apikeys required to run these integration tests were not supplied.
   absent keys: ${keysAbsent.join(', ')}
   run:
     source .agent/repo=.this/role=any/skills/use.apikeys.sh && npm run test:integration
```

keyrack.source() errors (per wish):
```
ConstraintError: keyrack not unlocked
fix: rhx keyrack unlock --env test --owner ehmpath
```

**behavior change**: error message format changes significantly. old pattern tells user to source file, new pattern tells user to unlock or set keys.

**is this ok?**: yes, this is the desired improvement per vision document.

**verdict**: holds. this is intentional behavior change.

---

### assumption 6: jest.acceptance.env.ts is identical pattern

**what we assumed**: both env files need same update.

**evidence from code**: compared lines 42-70 of jest.acceptance.env.ts vs 87-120 of jest.integration.env.ts.

differences:
- acceptance says "acceptance tests" vs "integration tests"
- acceptance lacks testdb provision check (lines 59-85 in integration)
- acceptance lacks AWS profile check for requiresAwsAuth edge case

**identical apikeys pattern**: yes, lines 42-70 acceptance match lines 87-120 integration structurally.

**verdict**: holds. both files get identical keyrack.source() block.

---

### assumption 7: readKeyrackConfig path is .agent/keyrack.yml

**what we assumed**: blueprint shows `KEYRACK_PATH = '.agent/keyrack.yml'`.

**evidence from code**: current USE_APIKEYS_PATH (line 15):
```typescript
const USE_APIKEYS_PATH = '.agent/repo=.this/role=any/skills/use.apikeys.json';
```

keyrack path from wish:
```
.agent/keyrack.yml
```

**path difference**: keyrack.yml is at repo root level, not nested in role structure.

**why this matters**: simpler path, easier to find, matches rhachet conventions.

**verdict**: holds. path change is intentional simplification.

---

### assumption 8: buildWorkflowSecretsBlock regex patterns work with keyrack

**what we assumed**: secrets injection regex patterns continue to work.

**evidence from code**: line 29-31 of buildWorkflowSecretsBlock.ts:
```typescript
const result = input.template.replace(
  /(uses: \.\/\.github\/workflows\/\.test\.yml\n(?:    if: [^\n]+\n)?    with:\n(?:      [^\n]+\n)+)/g,
  `$1    secrets:\n${secretsBlock}\n`,
);
```

**what changes**: only the source of apikeys array changes (readKeyrackConfig instead of readUseApikeysConfig). the secretsBlock generation and regex injection stay identical.

**verdict**: holds. regex patterns unaffected by config source change.

---

### assumption 9: deploy.yml and publish.yml also need keyrack migration

**what we assumed**: blueprint focuses on .test.yml.

**evidence from code**:
- deploy.yml.declapract.ts (cicd-service) uses buildWorkflowSecretsBlock
- publish.yml.declapract.ts (cicd-package) uses buildWorkflowSecretsBlock

**impact**: when buildWorkflowSecretsBlock switches to readKeyrackConfig, deploy.yml and publish.yml automatically use keyrack config too.

**is this correct?**: yes. if a repo has keyrack.yml with env.test keys, those same keys should propagate to all workflows that run tests.

**verdict**: holds. automatic propagation is correct behavior.

---

### assumption 10: bad-practice detects files at correct path

**what we assumed**: bad-practice checks `.agent/repo=.this/role=any/skills/use.apikeys.*`.

**evidence from code**: current path in jest env files:
```typescript
const apikeysConfigPath = join(
  process.cwd(),
  '.agent/repo=.this/role=any/skills/use.apikeys.json',
);
```

**bad-practice file structure** (from blueprint):
```
bad-practices/
  └── use-apikeys-legacy/
      ├── .agent/repo=.this/role=any/skills/use.apikeys.sh.declapract.ts
      ├── .agent/repo=.this/role=any/skills/use.apikeys.json.declapract.ts
```

**verdict**: holds. paths match current implementation.

---

## issues found and fixed

### issue 1: blueprint filediff tree unclear about test.yml.declapract.ts

**what i found**: filediff tree shows only `.test.yml.declapract.ts` but not `test.yml.declapract.ts`.

**how i fixed**: no fix needed. test.yml.declapract.ts uses buildWorkflowSecretsBlock which is already in the codepath tree. update to buildWorkflowSecretsBlock.ts covers test.yml, deploy.yml, publish.yml automatically.

**blueprint accurate**: yes, the dependency is captured via buildWorkflowSecretsBlock.

---

### issue 2: extraction pattern differs between files

**what i found**: buildExpectedContent in .test.yml.declapract.ts takes `apikeys: string[]` parameter, while buildWorkflowSecretsBlock internally extracts from config.

**how i fixed**: no fix needed. the extraction happens at different layers:
- .test.yml.declapract.ts: extract in check/fix, pass to buildExpectedContent
- buildWorkflowSecretsBlock: extract internally from readKeyrackConfig

both approaches work. consistent with current code structure.

---

## non-issues verified against code

### non-issue 1: empty array handle

**verified in code**: line 16-19 of buildExpectedContent:
```typescript
if (!input.apikeys.length) {
  return result;
}
```

**why it holds**: keyrack config returns `null` if file absent, `[]` if env.test absent. extraction with `?? []` handles both.

### non-issue 2: async/sync consistency

**verified in code**: buildWorkflowSecretsBlock is async (uses await). jest env files must be sync (per r2 review discovery).

**why it holds**: different contexts have different requirements. declapract utilities async is fine. jest env files sync is mandatory.

### non-issue 3: yaml package import

**verified in code**: blueprint uses `import yaml from 'yaml'`. this is correct default export for yaml npm package.

---

## key learnings from code read

1. **read actual implementation before review** — grasp of buildWorkflowSecretsBlock vs buildExpectedContent distinction required code read
2. **verify assumptions against line numbers** — line citation proves assumptions tested
3. **trace dependency chains** — buildWorkflowSecretsBlock is used by 3 workflow files, not just test.yml

