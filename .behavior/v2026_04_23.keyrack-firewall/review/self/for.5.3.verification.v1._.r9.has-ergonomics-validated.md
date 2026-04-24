# review.self: has-ergonomics-validated (r9)

## deeper reflection — are all workflows covered?

i compared vision to implementation for .test.yml. let me check other workflows.

### workflow inventory

| workflow | has firewall? | needs secrets? |
|----------|---------------|----------------|
| .test.yml | yes | yes (keyrack secrets) |
| test.yml (caller) | n/a (calls .test.yml) | passes inherit |
| deploy.yml | n/a (calls .test.yml) | passes inherit to test job |
| .deploy-sls.yml | **no** | has pagerduty-integration-key |
| publish.yml | ? | ? |

### potential gap: .deploy-sls.yml

`.deploy-sls.yml` runs acceptance tests after deployment (line 98):
```yaml
- name: test:acceptance
  run: STAGE=${{ inputs.stage }} npm run test:acceptance
```

this job does NOT have the firewall step. if acceptance tests need keyrack secrets, they won't have them.

### is this a problem?

let me reason through this:

1. **scope of this PR**: the vision focuses on test workflows (.test.yml)
2. **deploy acceptance tests**: run after deployment, may need different secrets (prod stage)
3. **current behavior**: uses explicit `secrets:` declaration, not inherit

**assessment**: this is a potential future enhancement, not a regression in this PR.

the PR scope is:
- .test.yml → has firewall
- caller workflows (test.yml, deploy.yml test job) → use inherit

the deploy acceptance tests are a different flow that may need separate consideration.

### do caller workflows pass secrets correctly?

| caller | pattern | correct? |
|--------|---------|----------|
| test.yml line 25 | `secrets: inherit` | yes |
| deploy.yml line 44 | `secrets: inherit` | yes |

both use inherit → firewall in .test.yml filters to declared keys.

---

## found issues

**potential issue**: .deploy-sls.yml acceptance tests may need firewall in the future.

**assessment**: not in scope for this PR. the PR covers test workflows. deploy workflows are a separate concern.

**status**: documented as future enhancement, not a blocker.

## why it holds

### the PR scope is clear

the vision states:
- "refactor buildWorkflowSecretsBlock.ts, simplify workflow declapract files"
- the firewall handles key filter, mechanism translation, and pattern validation

the scope is test workflows that used buildExpectedContent. deploy workflows have a different pattern.

### caller workflows are correct

test.yml and deploy.yml both use `secrets: inherit` for their test jobs. the firewall in .test.yml receives all secrets and filters appropriately.

### ergonomics are consistent within scope

| aspect | test.yml | deploy.yml (test job) |
|--------|----------|----------------------|
| secrets pattern | inherit | inherit |
| comment | yes | yes |
| firewall invoked | yes (via .test.yml) | yes (via .test.yml) |

### conclusion

the implementation matches the planned ergonomics for test workflows. deploy workflows (.deploy-sls.yml) are out of scope but documented as a potential future enhancement.

