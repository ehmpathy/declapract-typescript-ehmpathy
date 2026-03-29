# self-review r2: has-questioned-assumptions

fresh eyes. deeper pass. question each technical assumption in the blueprint.

## assumptions surfaced (deeper dive)

### assumption 1: keyrack.source() works with top-level await in jest env files

**what we assumed**: `await import('rhachet/keyrack')` works in jest env files.

**evidence checked**: read jest.integration.env.ts - it uses synchronous code currently. jest env files execute before tests run.

**what if top-level await not supported?**: jest env files may not support top-level await depending on node version and jest config.

**research needed**: check if jest env files support top-level await.

**action taken**: read extant jest.integration.env.ts to verify pattern.

**verdict**: the current file uses synchronous code. if top-level await isn't supported, we need an IIFE wrapper:
```typescript
(async () => {
  const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
  if (existsSync(keyrackYmlPath)) {
    const { keyrack } = await import('rhachet/keyrack');
    keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
  }
})();
```

**issue found**: blueprint needs IIFE wrapper for async code in jest env files.

---

### assumption 2: readKeyrackConfig needs to be async

**what we assumed**: blueprint shows `async` readKeyrackConfig with `util.promisify(fs.readFile)`.

**counterexample**: extant readUseApikeysConfig is async, but keyrack.yml read could be sync.

**simpler approach**: use `fs.readFileSync` for simpler code. jest env files don't need async yaml read.

**evidence checked**: buildWorkflowSecretsBlock is async, so readKeyrackConfig async is fine there.

**verdict**: holds. async is correct for declapract utilities. jest env file can use sync version inline if needed.

---

### assumption 3: keyrack.yml `env.test` is the correct path

**what we assumed**: blueprint reads `config.env?.test` from keyrack.yml.

**evidence checked**: wish handoff shows:
```yaml
env.test:
  - YOUR_API_KEY
```

**issue found**: yaml key is `env.test` (with dot), not nested `env: { test: [] }`.

**action taken**: need to verify yaml parse behavior for dotted keys.

---

### assumption 4: bad-practice directory location

**what we assumed**: bad-practice goes in `cicd-common/bad-practices/use-apikeys-legacy/`.

**alternative**: could go in `tests/bad-practices/` since jest env files are in tests practice.

**evidence checked**: the files being detected (use.apikeys.sh, use.apikeys.json) are in cicd-common best-practice.

**verdict**: holds. bad-practice should be co-located with the files it targets.

---

### assumption 5: package.json test:auth can be removed cleanly

**what we assumed**: removing test:auth command is safe.

**what if repos override test command?**: the eval pattern references test:auth. if test:auth removed but test command still uses eval, tests break.

**evidence checked**: blueprint shows test command update:
```json
"test": "set -eu && npm run test:commits && npm run test:types && ..."
```

**verdict**: holds. test command update removes the eval reference.

---

### assumption 6: yaml package import path

**what we assumed**: `import yaml from 'yaml'`.

**evidence checked**: this is the correct import for the yaml npm package.

**verdict**: holds.

---

### assumption 7: buildWorkflowSecretsBlock consumers handle empty array

**what we assumed**: if keyrack.yml absent or env.test empty, utility returns `[]` and callers handle it.

**evidence checked**: current code in buildWorkflowSecretsBlock:
```typescript
const apikeys = apikeysConfig?.apikeys?.required ?? [];
if (!apikeys.length) {
  return input.template;
}
```

**verdict**: holds. same pattern works with keyrack config.

---

## issues found and fixed

### issue 1: top-level await may not work in jest env files

**what i found**: blueprint uses `await import()` at top level. jest env files may not support top-level await.

**how i fixed**: updated blueprint section "2. jest.integration.env.ts keyrack block" to wrap async code in IIFE:
```typescript
(async () => {
  const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
  if (existsSync(keyrackYmlPath)) {
    const { keyrack } = await import('rhachet/keyrack');
    keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
  }
})();
```

**blueprint updated**: yes, section 2 now uses IIFE wrapper.

**why this matters**: without IIFE, jest env file would fail to parse.

---

### issue 2: yaml key path differs from assumed

**what i found**: wish shows `env.test:` which in yaml parses as dotted key `{ 'env.test': [...] }` not nested `{ env: { test: [...] } }`.

**how i fixed**: updated blueprint section "1. readKeyrackConfig.ts" interface from:
```typescript
env?: {
  test?: string[];
  prep?: string[];
  prod?: string[];
};
```
to:
```typescript
'env.test'?: string[];
'env.prep'?: string[];
'env.prod'?: string[];
```

**blueprint updated**: yes, KeyrackConfig interface now uses dotted keys.

**why this matters**: without correct key path, keyrack config would never find test keys.

---

### issue 3: codepath tree output description inconsistent with interface

**what i found**: codepath tree shows `output: { org, env: { test: string[] } }` but interface uses dotted keys.

**how i fixed**: updated blueprint codepath tree output description.

**blueprint updated**: yes, codepath tree now shows `'env.test': string[]` to match KeyrackConfig interface.

---

### issue 4: IIFE async doesn't block jest from starting tests

**what i found**: the IIFE pattern `(async () => { ... })();` starts but doesn't block. jest will start tests before the async IIFE completes.

**evidence checked**: jest env files run synchronously. an async IIFE returns a promise immediately, then jest proceeds to run tests while the promise is pending.

**critical question**: does keyrack.source() need to complete before tests run?

**answer**: yes. credentials must be in process.env before tests import modules that use them.

**simpler approach**: since keyrack.source() itself is synchronous (per wish handoff), only the import is async. we need to either:
1. use require() instead of dynamic import (sync)
2. use top-level await if jest supports it
3. accept that repos without rhachet will fail

**how i fixed**: updated blueprint to use require() instead of async IIFE:
```typescript
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath)) {
  try {
    const { keyrack } = require('rhachet/keyrack');
    keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
  } catch {
    // rhachet not installed, skip silently since keyrack.yml exists but rhachet absent
  }
}
```

**blueprint updated**: yes, jest.integration.env.ts keyrack block now uses sync require() with try/catch.

**why this matters**: async IIFE would cause race condition where tests run before credentials are set.

---

## non-issues that hold

### non-issue 1: async readKeyrackConfig utility

**why it holds**: declapract utilities are async. follows established pattern.

### non-issue 2: bad-practice in cicd-common

**why it holds**: files being detected are in cicd-common. co-location is correct.

### non-issue 3: test command update

**why it holds**: blueprint shows both test:auth removal and test command update together.

---

## key learnings

1. **question runtime environment constraints** — jest env files have specific requirements
2. **verify yaml parse behavior** — dotted keys parse differently than nested keys
3. **test assumptions against actual code** — read the extant files before assuming patterns

