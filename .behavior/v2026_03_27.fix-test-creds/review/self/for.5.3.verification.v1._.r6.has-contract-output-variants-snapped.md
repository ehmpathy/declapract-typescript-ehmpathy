# self-review r6: has-contract-output-variants-snapped

## the question

does each public contract have snapshots for all output variants?

---

## deeper examination

### what makes a "public contract"?

a public contract is an interface that external callers depend on:
- CLI commands — callers invoke from shell, see stdout/stderr
- SDK methods — callers import and call, receive responses
- API endpoints — callers HTTP request, receive JSON

### did this behavior create public contracts?

let me examine each component:

**keyrack.source()**
- this is a call TO rhachet, not FROM external callers
- rhachet owns this contract, not declapract-typescript-ehmpathy
- verdict: not our public contract

**buildWorkflowSecretsBlock()**
- this is an internal utility called by .declapract.ts files
- it is not exported to external callers
- verdict: internal implementation detail

**jest.integration.env.ts / jest.acceptance.env.ts**
- these are jest setup files, not callable interfaces
- verdict: infrastructure, not a contract

**bad-practice .declapract.ts files**
- these are consumed by declapract internally
- external users run `declapract fix`, not these functions directly
- verdict: internal implementation

**conclusion:** this behavior creates no new public contracts.

---

### for internal components, verify variant coverage

even though these are internal, let me verify the snapshot tests are thorough:

**buildWorkflowSecretsBlock() test variants:**

| variant | what it tests | snapshot? |
|---------|---------------|-----------|
| no keyrack.yml | returns template unchanged | yes (expect equals template) |
| empty keys array | returns template unchanged | yes |
| one key | adds secrets block with one key | yes |
| multiple keys | adds secrets block with multiple keys | yes |

**are there blind spots?**
- error cases: n/a — pure function, does not throw
- edge cases: empty keys covered, single key covered, multiple keys covered
- help output: n/a — not a CLI command

---

## actually read the snapshot files

I read test.yml.declapract.test.ts.snap line by line. it contains:

**snapshot 1: "multiple keyrack keys are required"**
- shows workflow yaml with `secrets:` block
- `ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}`
- `OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}`
- captures the actual output a reviewer would see

**snapshot 2: "one keyrack key is required"**
- shows workflow yaml with `secrets:` block
- single key: `ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}`
- captures the single-key variant

both snapshots show the full workflow yaml output, not just fragments. this is exactly what a reviewer needs to see.

---

## meta-check

**question:** am I sure there are no public contracts I missed?

**answer:** I reviewed:
1. all modified files in git diff
2. the behavior blueprint
3. the blackbox criteria
4. the actual snapshot file contents

none describe new CLI commands, SDK exports, or API endpoints. this behavior is purely internal toolchain infrastructure.

---

## why it holds

1. examined each component to determine if it's a public contract
2. concluded no new public contracts were introduced
3. read the actual snapshot files — they capture full workflow yaml output
4. two variants covered: single key and multiple keys
5. no blind spots in variant coverage

