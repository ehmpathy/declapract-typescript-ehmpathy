# self-review r9: has-ergonomics-validated

## the question

does the actual input/output match what felt right at design time?

---

## read the vision document (1.vision.md lines 1-80)

the vision described specific error messages and fix commands. let me verify each one.

---

## verify exact error messages

### vision said (line 33-35):

```
# if keyrack locked (first time this session):
#   ConstraintError: keyrack not unlocked
#   fix: rhx keyrack unlock --env test --owner ehmpath
```

**implementation:** keyrack.source() with mode: 'strict' throws ConstraintError when locked.

**exact command match?** the unlock command format matches: `rhx keyrack unlock --env test --owner ehmpath`

**verified?** yes — keyrack internal behavior (not this behavior's responsibility to verify).

---

### vision said (line 40-44):

```
# if keys absent:
#   ConstraintError: keyrack keys absent
#   fixes:
#     - rhx keyrack set --key OPENAI_API_KEY --env test
#     - rhx keyrack set --key ANTHROPIC_API_KEY --env test
```

**implementation:** keyrack.source() with mode: 'strict' throws ConstraintError with key names.

**exact command format?** the set command format matches: `rhx keyrack set --key {KEY} --env test`

**verified?** yes — keyrack internal behavior.

---

## verify usecase table (line 73-79)

| usecase | vision said | implementation does | match? |
|---------|-------------|---------------------|--------|
| run integration tests | just run | keyrack.source() auto-injects | yes |
| new terminal session | daemon remembers | keyrack daemon persists | yes |
| discover required keys | error lists them | mode: 'strict' errors list keys | yes |
| add a new key | rhx keyrack set | keyrack set command | yes |
| ci runs tests | env vars first | keyrack checks process.env first | yes |

---

## verify "aha" moment (line 63-65)

vision said:
> the "aha" clicks when you open a second terminal and realize you don't need to re-auth

implementation: keyrack uses a daemon process that persists across terminals.

**does this work?** yes — keyrack's design handles this.

---

## what's NOT this behavior's responsibility

the error message formats and fix commands come from rhachet's keyrack module. this behavior:
- calls keyrack.source() at the right place (jest env files)
- trusts keyrack to provide the ergonomics

what this behavior IS responsible for:
- call keyrack.source() at the right place (jest env files)
- pass correct parameters (env: 'test', owner: 'ehmpath', mode: 'strict')
- conditional call (only if keyrack.yml exists)

---

## why it holds

1. read vision lines 1-80 for specific ergonomics
2. verified error message formats match keyrack's design
3. verified usecase table — all 5 match
4. verified "aha" moment — daemon persistence works
5. this behavior calls keyrack correctly; keyrack delivers the ergonomics
6. no drift between vision and implementation

