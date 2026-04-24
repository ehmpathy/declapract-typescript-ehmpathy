# review.self: has-pruned-backcompat (r2)

## deeper review for backwards compatibility

re-examined the actual code changes line by line:

---

### firewall step placement

**the code**:
```yaml
- name: get node-modules from cache
  uses: actions/cache/restore@v4
  ...

- name: prepare:rhachet
  run: npm run prepare:rhachet --if-present

- name: keyrack firewall
  run: npx rhachet keyrack firewall --env test --from 'json(env://SECRETS_JSON)' --into github.actions
  env:
    SECRETS_JSON: ${{ toJSON(secrets) }}

- name: get aws auth, if creds supplied
  ...
```

**verified**:
- firewall runs AFTER node-modules (needs rhachet installed)
- firewall runs BEFORE aws auth (correct order)
- firewall runs BEFORE start:testdb (correct order)

**holds**: placement is correct, no backcompat concern

---

### prepare:rhachet step

**the code**: `npm run prepare:rhachet --if-present`

**backcompat check**:
- `--if-present` flag: npm will skip if npm command doesn't exist
- projects without prepare:rhachet npm command: no failure

**holds**: graceful degradation via `--if-present`

---

### firewall with no keyrack.yml

**the code**: `npx rhachet keyrack firewall --env test ...`

**backcompat check**:
- vision edgecase: "project has no keyrack.yml → firewall step is no-op"
- verified: firewall exits 0 when no keyrack.yml found

**holds**: firewall handles gracefully, not backcompat we added

---

### `--env test` for both integration and acceptance

**the code**: both test-shards-integration and test-shards-acceptance use `--env test`

**backcompat check**:
- is this correct? yes — both run in the "test" environment
- keyrack.yml declares keys per env (test, prep, prod)
- integration and acceptance tests both need "test" env keys

**holds**: correct behavior, no backcompat concern

---

### secrets: inherit in caller workflows

**the code**: `secrets: inherit` added to test.yml, deploy.yml, publish.yml

**backcompat check**:
- this passes ALL repository secrets to the callee workflow
- is this more permissive than before? yes
- is this a security concern? no — firewall filters at runtime

**potential concern**: what if a project has secrets they DON'T want passed?

**answer**: `secrets: inherit` is standard GitHub Actions pattern. if a project needs explicit control, they can fork the workflow. this is not a backcompat concern we need to handle — it's the intended behavior.

**holds**: explicitly requested in vision

---

## found issues

none found in r2. the implementation follows the vision without backcompat code.

## why it holds

each component was verified against:
1. the vision requirements
2. actual runtime behavior
3. graceful degradation patterns

no "to be safe" code was added. all edge cases are handled by:
- `--if-present` flag for optional npm commands
- firewall's built-in handle of absent keyrack.yml
- GitHub Actions standard patterns
