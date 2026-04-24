# review.self: has-contract-output-variants-snapped (r5)

## question: does each public contract have exhaustive snapshots?

### what are the contracts in this PR?

| contract | type | callers |
|----------|------|---------|
| .test.yml template | workflow YAML | projects that use declapract-typescript-ehmpathy |
| fix function | declapract function | declapract CLI |

### are there snapshots?

**template file**: the `.test.yml` template file IS the snapshot. it's checked into git. changes show in diffs.

**fix function**: the test asserts `result.contents === templateContent`. no separate snapshot.

### should there be snapshots?

let me evaluate each contract type against the guide.

| contract type | required | what we have |
|---------------|----------|--------------|
| cli command | stdout + stderr variants | n/a — not a CLI |
| api endpoint | response body variants | n/a — not an API |
| sdk method | return value variants | n/a — not an SDK |
| template file | template content | template file itself |

this is a **template definition** PR, not a contract-output PR.

the "output" is:
1. the template YAML (already in git as `.test.yml`)
2. the fix function returns template content (tested via equality)

### does the template need a snapshot?

the template file serves as its own snapshot:
- changes to template show in git diff
- reviewers see exactly what the workflow will look like
- no separate snapshot test needed

### what about output variants?

| variant | applicable? | coverage |
|---------|-------------|----------|
| success | yes | template file exists, fix returns it |
| error | no | check is FileCheckType.EQUALS, no error path |
| help/usage | no | not a CLI |
| edge cases | no | declarative template, no edge case logic |

---

## found issues

none.

## why it holds

### templates are self-evident

the template file (`.test.yml`) IS the expected output. it lives in git. PRs show the diff. this is better than a snapshot test because:
- reviewers see the actual YAML structure
- no indirection through snapshot files
- the source of truth is the template itself

### fix behavior is trivial

the fix function returns `context.declaredFileContents` (the template). there are no variants:
- no conditional logic
- no error paths
- no edge cases

the single test case covers the entire behavior space.

### FileCheckType.EQUALS eliminates output variants

when check is `FileCheckType.EQUALS`:
- match → file passes (no output)
- mismatch → fix returns template (one output)

there is only one output variant: the template content. it is tested.

### conclusion

no separate snapshots needed. the template file is the snapshot. the fix behavior is deterministic and fully tested.

