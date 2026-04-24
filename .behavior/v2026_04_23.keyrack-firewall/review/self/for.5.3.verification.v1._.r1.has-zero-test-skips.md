# review.self: has-zero-test-skips (r1)

## question: did you verify zero skips?

### search for .skip() or .only()

```
grep -r "\.skip\(|\.only\(" **/*.test.ts
```

**result**: no files found

no test is skipped. no test is isolated with .only(). all tests run when invoked.

### search for silent credential bypasses

```
grep -ri "if.*!.*credential.*return|if.*!.*cred.*return" **/*.test.ts
```

**result**: no files found

no test returns early when credentials are absent. tests either run with credentials or fail loud.

### search for prior failures carried forward

examined git diff — no tests were modified to "fix" by weaken assertions:
- deleted tests: because behavior was deleted (slug parse logic)
- kept tests: assertions verify real behavior (fix returns template)

no test was modified to make a failure pass.

---

## found issues

none. zero skips verified:
- no .skip() or .only() in any test file
- no silent credential bypasses
- no prior failures carried forward

## why it holds

### why no .skip()/.only()?

all tests run. the only deleted tests were for deleted behavior (buildWorkflowSecretsBlock.ts slug parse).

### why no credential bypasses?

the tests in this PR do not require credentials:
- .test.yml.declapract.test.ts verifies fix returns template contents
- no external API calls
- no database connections
- pure unit tests

### why no prior failures?

this PR simplifies behavior. prior tests verified complex slug parse. the new tests verify simple template return. no assertion was weakened — the behavior changed.

### conclusion

zero skips. all tests run. all assertions verify real behavior.
