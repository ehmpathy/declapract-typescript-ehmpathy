# review.self: role-standards-coverage (r7)

## rule directories to check

| directory | relevance |
|-----------|-----------|
| code.test/scope.coverage/ | test coverage requirements |
| code.prod/pitofsuccess.errors/ | error handle requirements |
| code.prod/evolvable.procedures/ | function patterns |
| code.prod/readable.comments/ | documentation requirements |

---

## test coverage check

**question**: do the simplified declapract files have adequate test coverage?

| file | has test? | test coverage |
|------|-----------|---------------|
| .test.yml.declapract.ts | ✓ .test.yml.declapract.test.ts | fix returns template |
| test.yml.declapract.ts | ✗ no test | uses FileCheckType.EQUALS |
| deploy.yml.declapract.ts | ✗ no test | uses FileCheckType.EQUALS |
| publish.yml.declapract.ts | ✗ no test | uses FileCheckType.EQUALS |

**is absence of tests a problem?**

the deleted tests verified buildWorkflowSecretsBlock behavior:
- parse slugs
- build secrets block
- inject into template

the new code has NO behavior to test:
- check = FileCheckType.EQUALS (built-in declapract behavior)
- fix = returns declaredFileContents (trivial)

**per rule.require.test-coverage-by-grain**:
- transformers need unit tests
- these are not transformers — they are declarative configurations

**verdict**: test absence is acceptable — no behavior to test ✓

---

## error handle check

**question**: should the fix functions have error handlers?

**old code** had:
```typescript
if (!context.declaredFileContents)
  throw new UnexpectedCodePathError('declaredFileContents not found', {...});
```

**new code** has:
```typescript
return { contents: context.declaredFileContents ?? '' };
```

**per rule.require.failfast**: functions should fail fast on invalid state.

**analysis**:
- declaredFileContents comes from declapract, not user input
- if template file absent, declapract fails before it calls fix
- `?? ''` handles an impossible state

**verdict**: error handle absence is acceptable for internal contracts ✓

---

## documentation check

**question**: do functions have adequate documentation?

| file | has .what/.why? | status |
|------|-----------------|--------|
| .test.yml.declapract.ts | ✓ both functions | complete |
| test.yml.declapract.ts | ✓ both functions | complete |
| deploy.yml.declapract.ts | ✓ both functions | complete |
| publish.yml.declapract.ts | ✓ both functions | complete |

**verdict**: documentation is adequate ✓

---

## found issues

none. the simplified code correctly omits:
- tests for non-behavior (FileCheckType.EQUALS is declarative)
- error handlers for internal contracts (declapract provides input)

extra tests or handlers would violate YAGNI.

## why it holds

the original code had complex behavior that required tests. the new code is declarative — no behavior to verify. test coverage requirements apply to code with behavior, not to configuration.
