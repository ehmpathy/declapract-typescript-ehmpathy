# self-review r1: has-behavior-coverage

## the question

does the verification checklist show every behavior from wish/vision has a test?

---

## wish behaviors (from 0.wish.md)

| behavior | tested by | covered? |
|----------|-----------|----------|
| use keyrack.source() instead of use.apikeys.sh | jest.integration.env.ts + jest.acceptance.env.ts compile | yes |
| delete use.apikeys.sh and use.apikeys.json | bad-practice tests (FileCheckType.EXISTS + fix null) | yes |
| update jest env files | compile check via test:types | yes |
| update package.json to remove test:auth | compile check via test:types | yes |
| update buildWorkflowSecretsBlock | test.yml.declapract.test.ts | yes |
| update .test.yml for prepare:rhachet | .test.yml.declapract.test.ts | yes |

---

## vision behaviors (from 1.vision.md)

| usecase | tested by | covered? |
|---------|-----------|----------|
| keyrack locked → error with unlock command | keyrack.source() internal behavior, not declapract scope | n/a |
| keys absent → error with set commands | keyrack.source() internal behavior, not declapract scope | n/a |
| ci env vars → keyrack prefers env vars | keyrack.source() internal behavior, not declapract scope | n/a |
| bad-practice detects old files | use.apikeys.sh.declapract.test.ts, use.apikeys.json.declapract.test.ts | yes |

note: keyrack.source() error behaviors are tested in rhachet, not declapract. declapract tests cover the integration of keyrack.source() into the best-practice templates.

---

## why it holds

1. all wish behaviors have test coverage via compile checks or explicit tests
2. vision behaviors related to keyrack.source() internals are out of declapract scope
3. bad-practice detection has explicit tests
4. all tests pass (verified via npm run test)
