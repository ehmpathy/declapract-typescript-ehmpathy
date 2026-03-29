# self-review: has-questioned-assumptions

question technical assumptions in the blueprint.

## assumptions surfaced

### assumption 1: keyrack.source() is synchronous

**what we assumed**: the blueprint shows keyrack.source() called without await in jest env files.

**what if async?**: jest env files would need async wrapper or top-level await.

**evidence checked**: wish handoff shows no await. rhachet keyrack is designed for sync call in env files.

**verdict**: holds. keyrack.source() is synchronous by design.

---

### assumption 2: yaml package is available or can be added

**what we assumed**: blueprint uses yaml package to parse keyrack.yml.

**counterexample?**: could use js-yaml instead. could parse with regex if simple.

**evidence checked**: yaml package is commonly used. declapract already has yaml-like patterns.

**simpler approach**: regex would be fragile for yaml. yaml package is correct.

**verdict**: holds. yaml package is the right choice.

---

### assumption 3: keyrack.yml path is fixed at .agent/keyrack.yml

**what we assumed**: blueprint hardcodes `.agent/keyrack.yml` path.

**what if configurable?**: could allow custom path via environment variable.

**evidence checked**: wish handoff shows `.agent/keyrack.yml`. this is the standard location.

**simpler approach**: fixed path is simpler. no config needed.

**verdict**: holds. fixed path aligns with convention.

---

### assumption 4: env.test is the only env we need for ci secrets

**what we assumed**: blueprint reads `env.test` from keyrack.yml for ci workflow secrets.

**what if env.prep or env.prod needed?**: ci only runs integration tests, which use test credentials.

**evidence checked**: criteria usecase.3 says "ci runs npm run test:integration" with "credentials from env vars".

**verdict**: holds. test env is correct for ci integration tests.

---

### assumption 5: bad-practice can delete files when fix returns null

**what we assumed**: `{ contents: null }` in fix function deletes the file.

**evidence checked**: briefs document this as the standard pattern. see howto.add-bad-practice brief.

**verdict**: holds. this is documented declapract behavior.

---

### assumption 6: buildWorkflowSecretsBlock can be extended without break

**what we assumed**: switch from readUseApikeysConfig to readKeyrackConfig won't break callers.

**evidence checked**: buildWorkflowSecretsBlock is used by .test.yml, test.yml, publish.yml, deploy.yml declapract files. all read apikeys from the utility.

**what if shape differs?**: utility returns same output shape (array of key names). callers unchanged.

**verdict**: holds. interface stays the same, only source changes.

---

### assumption 7: jest env files can import from rhachet/keyrack

**what we assumed**: `import { keyrack } from 'rhachet/keyrack'` works in jest env files.

**what if not?**: repos without rhachet would fail at import time.

**evidence checked**: vision "questions to validate" item 4 flags this. wish says rhachet >=1.39.1 required.

**mitigation**: existsSync check before import. if keyrack.yml absent, import not reached.

**issue found**: blueprint doesn't handle repos without rhachet installed.

---

## issues found and fixed

### issue 1: repos without rhachet would fail at import time

**what i found**: blueprint shows static import `import { keyrack } from 'rhachet/keyrack'` at top of jest env file. if rhachet not installed, import fails before existsSync check runs.

**options**:
1. dynamic import inside the if block
2. try/catch around static import
3. require rhachet as prereq (document in migration guide)

**how i fixed**: blueprint should use dynamic import:
```typescript
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath)) {
  const { keyrack } = await import('rhachet/keyrack');
  keyrack.source({
    env: 'test',
    owner: 'ehmpath',
    mode: 'strict',
  });
}
```

**why this matters**: repos that haven't upgraded rhachet can still run tests (they won't have keyrack.yml either).

---

## non-issues that hold

### non-issue 1: keyrack.source() mode is 'strict'

**why it holds**: wish handoff shows `mode: 'strict'`. strict mode fails fast if keys absent, which is the desired behavior per criteria.

### non-issue 2: owner is hardcoded to 'ehmpath'

**why it holds**: wish handoff shows `owner: 'ehmpath'`. this is the org owner for ehmpathy repos.

### non-issue 3: test:auth removal breaks repos that source use.apikeys.sh

**why it holds**: bad-practice will delete use.apikeys.sh when declapract fix runs. the files are removed together.

---

## key learnings

1. **static imports fail before runtime checks** — use dynamic import for optional dependencies
2. **question import order** — imports execute before any code in the file

