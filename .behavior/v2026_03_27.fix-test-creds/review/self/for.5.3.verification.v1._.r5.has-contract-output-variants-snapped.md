# self-review r5: has-contract-output-variants-snapped

## the question

does each public contract have snapshots for all output variants?

---

## identify public contracts in this behavior

**what is a public contract?**
- CLI commands with stdout/stderr
- SDK methods with documented responses
- API endpoints

**what did this behavior change?**

| component | type | public contract? |
|-----------|------|------------------|
| keyrack.source() | external library call | no (rhachet's contract, not ours) |
| buildWorkflowSecretsBlock() | internal utility | no (internal to declapract) |
| jest.integration.env.ts | test infrastructure | no (not a contract) |
| jest.acceptance.env.ts | test infrastructure | no (not a contract) |
| bad-practice fix functions | declapract internal | no (internal to declapract) |
| .test.yml workflow | infrastructure | no (not a user-callable contract) |

**conclusion:** this behavior introduces no new public contracts.

---

## does snapshot coverage exist for internal components?

even though these are internal, let me verify snapshots exist:

| component | snapshot file | status |
|-----------|---------------|--------|
| buildWorkflowSecretsBlock() | test.yml.declapract.test.ts.snap | exists, updated |
| .test.yml template | .test.yml.declapract.test.ts.snap | exists, updated |

---

## output variants exercised

### buildWorkflowSecretsBlock()

| variant | tested? | snapshot? |
|---------|---------|-----------|
| no keys required | yes | yes (result equals template) |
| one key required | yes | yes |
| multiple keys required | yes | yes |
| error case | n/a (pure function, no error paths) | n/a |

---

## why it holds

1. this behavior introduces no new public contracts
2. all internal components with testable output have snapshot coverage
3. multiple variants are exercised (no keys, one key, multiple keys)
4. no blind spots in review — all outputs are captured

