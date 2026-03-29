# self-review r8: has-role-standards-adherance

review for adherance to mechanic role standards.

## rule directories checked

| directory | relevance |
|-----------|-----------|
| lang.terms/ | name conventions in code examples |
| lang.tones/ | lowercase, no buzzwords |
| code.prod/evolvable.procedures/ | input-context pattern |
| code.prod/evolvable.architecture/ | bounded contexts |
| code.prod/pitofsuccess.errors/ | fail-fast pattern |
| code.prod/readable.comments/ | .what/.why headers |
| code.test/ | test file patterns |

---

## standards checked

### lang.terms/rule.require.ubiqlang

**standard**: use consistent canonical terms, no synonym drift.

**blueprint uses**:
- `keyrack` consistently (not "vault", "secrets", "keystore")
- `source` consistently (not "inject", "load", "hydrate")
- `check` for declapract (standard term)
- `fix` for declapract (standard term)

**verdict**: pass.

### lang.terms/rule.forbid.gerunds

**standard**: forbid gerunds (-ing as nouns).

**blueprint text scan**:
- line 5: "replace" - verb, ok
- line 47: "invoke keyrack cli" - verb, ok
- line 68: "delete" - verb, ok
- line 92: "source credentials" - verb, ok

no gerunds found in code or prose.

**verdict**: pass.

### lang.tones/rule.prefer.lowercase

**standard**: use lowercase for comments and prose.

**blueprint comments** (lines 92-95):
```typescript
/**
 * .what = source credentials from keyrack for test env
 * .why = auto-inject keys into process.env, fail fast if absent
 */
```

all lowercase except proper nouns.

**verdict**: pass.

### code.prod/evolvable.procedures/rule.require.input-context-pattern

**standard**: procedures use (input, context) pattern.

**blueprint buildWorkflowSecretsBlock** (lines 150-153):
```typescript
export const buildWorkflowSecretsBlock = (
  input: { template: string },
  context: { getProjectRootDirectory: () => string },
): string => {
```

correctly uses (input, context) pattern.

**verdict**: pass.

### code.prod/evolvable.procedures/rule.require.arrow-only

**standard**: use arrow functions, no function keyword.

**blueprint code**:
- line 150: `export const buildWorkflowSecretsBlock = (`
- line 113: `export const fix: FileFixFunction = () => {`

all arrow functions, no function keyword.

**verdict**: pass.

### code.prod/readable.comments/rule.require.what-why-headers

**standard**: every procedure has .what and .why comments.

**blueprint buildWorkflowSecretsBlock** (lines 146-149):
```typescript
/**
 * .what = builds workflow content with keyrack secrets block for .test.yml
 * .why = single source of truth for test.yml, publish.yml, deploy.yml check+fix
 */
```

correctly has .what and .why.

**blueprint keyrack block** (lines 92-95):
```typescript
/**
 * .what = source credentials from keyrack for test env
 * .why = auto-inject keys into process.env, fail fast if absent
 */
```

correctly has .what and .why.

**verdict**: pass.

### code.prod/pitofsuccess.errors/rule.require.fail-fast

**standard**: early returns for invalid state.

**blueprint buildWorkflowSecretsBlock**:
- line 156-158: early return if no keyrack.yml
- line 165-167: early return if no vars

```typescript
if (!existsSync(keyrackYmlPath)) {
  return input.template;
}
...
if (!keyrackVars.length) {
  return input.template;
}
```

correctly uses early returns.

**verdict**: pass.

### code.test/frames.behavior/rule.require.given-when-then

**standard**: tests use given/when/then from test-fns.

**blueprint test example** (lines 125-134):
```typescript
describe('old-use-apikeys use.apikeys.sh', () => {
  it('should check for file existence', () => {
    expect(check).toEqual(FileCheckType.EXISTS);
  });

  it('should return null contents to delete the file', async () => {
    const result = await fix('#!/bin/sh\n# content', {} as any);
    expect(result.contents).toBeNull();
  });
});
```

**issue found**: test uses `describe/it` instead of `given/when/then`.

**however**: this is a declapract test file (`.declapract.test.ts`), which follows declapract conventions not mechanic conventions. declapract tests are simple check/fix verifications.

**verdict**: pass. declapract test convention is valid for this context.

---

## issues found and fixed

none. blueprint follows mechanic role standards.

---

## non-issues verified

### non-issue 1: test uses describe/it instead of given/when/then

**observed**: test example uses `describe/it` pattern.

**why it holds**: this is a declapract test file (`.declapract.test.ts`). declapract tests are simple check/fix verifications that don't need the full given/when/then structure. the pattern matches extant declapract tests in the codebase (35 examples found in r6 review).

### non-issue 2: no type annotations on some vars

**observed**: `keyrackVars` has type annotation inline.

**why it holds**: type is specified as `string[]` after JSON.parse for safety. this is correct since JSON.parse returns `any`.

---

## summary

| category | count |
|----------|-------|
| rule directories checked | 7 |
| standards checked | 8 |
| violations found | 0 |
| violations fixed | 0 |
| non-issues verified | 2 |

blueprint follows mechanic role standards. names, comments, procedure patterns, and error response all conform.
