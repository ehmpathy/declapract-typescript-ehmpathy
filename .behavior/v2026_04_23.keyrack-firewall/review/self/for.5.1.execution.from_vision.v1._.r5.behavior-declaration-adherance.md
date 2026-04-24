# review.self: behavior-declaration-adherance (r5)

## review for adherence to vision

compared implementation line-by-line against vision specification:

---

### firewall step syntax (vision lines 37-42)

**vision specifies**:
```yaml
- name: keyrack firewall
  run: npx rhachet keyrack firewall --env test --from 'json(env://SECRETS_JSON)' --into github.actions
  env:
    SECRETS_JSON: ${{ toJSON(secrets) }}
```

**implementation matches**:
```yaml
- name: keyrack firewall
  run: npx rhachet keyrack firewall --env test --from 'json(env://SECRETS_JSON)' --into github.actions
  env:
    SECRETS_JSON: ${{ toJSON(secrets) }}
```

**verdict**: exact match ✓

---

### caller workflow pattern (vision lines 79-84)

**vision specifies**:
```yaml
jobs:
  test:
    uses: ./.github/workflows/.test.yml
    secrets: inherit  # or explicit secrets block
```

**implementation (test.yml lines 19-25)**:
```yaml
jobs:
  suite:
    uses: ./.github/workflows/.test.yml
    with:
      creds-aws-region: us-east-1
      creds-aws-role-arn: ${{ vars.CREDS_CICD_AWS_DEV_OIDC_ROLE_ARN }}
    secrets: inherit # keyrack firewall in .test.yml filters to declared keys
```

**differences**:
- job name is `suite` not `test` — this is an extant convention, not a deviation
- has `with:` block for AWS creds — this is extant functionality, not a deviation

**verdict**: adheres to vision; differences are extant patterns ✓

---

### firewall behavior (vision lines 45-51)

**vision describes the firewall**:
1. reads `keyrack.yml` to know which keys belong to this env
2. filters input to only declared keys (security boundary)
3. translates mechanisms (GitHub App → ghs_* token)
4. validates patterns (blocks ghp_*, AKIA*)
5. exports to `$GITHUB_ENV` with proper mask

**implementation**:
- `--env test` ← reads keyrack.yml for test env
- `--from 'json(env://SECRETS_JSON)'` ← input from JSON
- `--into github.actions` ← exports to $GITHUB_ENV

**verdict**: command invocation enables all described behaviors ✓

---

### declapract simplification (vision line 137)

**vision specifies**: "refactor buildWorkflowSecretsBlock.ts, simplify workflow declapract files"

**implementation**:
- buildWorkflowSecretsBlock.ts deleted (no consumers)
- declapract files use FileCheckType.EQUALS (no slug parse)

**verdict**: adheres to vision ✓

---

### secrets: inherit pattern (vision line 236)

**vision specifies**: "use `secrets: inherit` in callers"

**implementation**:
- test.yml: `secrets: inherit`
- deploy.yml (cicd-service): `secrets: inherit`
- publish.yml: `secrets: inherit`
- deploy.yml (expo): `secrets: inherit`

**verdict**: all caller workflows have secrets: inherit ✓

---

## found issues

none. the implementation matches the vision specification:

| vision element | implementation | match |
|----------------|----------------|-------|
| firewall step syntax | exact match | ✓ |
| caller workflow pattern | adheres with extant extras | ✓ |
| firewall behavior flags | enables described behavior | ✓ |
| declapract simplification | FileCheckType.EQUALS | ✓ |
| secrets: inherit | all callers have it | ✓ |

## why it holds

the implementation follows the vision exactly. minor differences (job name, with: block) are extant patterns that the vision didn't ask to change. no deviations from the specification were found.
