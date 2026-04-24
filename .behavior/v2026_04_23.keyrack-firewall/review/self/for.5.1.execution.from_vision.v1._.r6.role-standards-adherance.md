# review.self: role-standards-adherance (r6)

## rule directories checked

| directory | applies to |
|-----------|------------|
| lang.terms/ | all names and terms |
| lang.tones/ | comments and documentation |
| code.prod/readable.comments/ | comment format |
| code.prod/readable.narrative/ | code structure |
| code.prod/evolvable.procedures/ | TypeScript patterns |
| code.test/ | test patterns |

---

## review by rule category

### lang.terms

| rule | status | evidence |
|------|--------|----------|
| rule.forbid.gerunds | ✓ | no gerunds in code or comments |
| forbidden term rules | ✓ | no forbidden terms |
| rule.require.ubiqlang | ✓ | uses domain terms (firewall, keyrack, secrets) |

**note**: comments use "translates" (verb) and "filters" (verb), not gerunds.

---

### lang.tones

| rule | status | evidence |
|------|--------|----------|
| rule.prefer.lowercase | ✓ | comments in lowercase |
| rule.forbid.buzzwords | ✓ | no buzzwords |
| rule.require.what-why-headers | ✓ | declapract files have .what/.why |

---

### code.prod/readable.comments

| rule | status | evidence |
|------|--------|----------|
| .why = format | ✓ | workflow comments use `.why = ` format |

**workflow comment example**:
```yaml
# .why = keyrack firewall translates and validates secrets before tests run
```

---

### code.prod/evolvable.procedures

| rule | status | evidence |
|------|--------|----------|
| rule.require.arrow-only | ✓ | declapract files use arrow functions |
| rule.require.input-context-pattern | ✓ | fix uses (contents, context) |

**declapract file example**:
```typescript
export const fix: FileFixFunction = async (_contents, context) => {
  return { contents: context.declaredFileContents ?? '' };
};
```

---

### code.test

| rule | status | evidence |
|------|--------|----------|
| rule.require.given-when-then | ✓ | test file uses given/when/then |

**test file structure**:
```typescript
describe('.test.yml.declapract', () => {
  given('a workflow file with outdated content', () => {
    when('fix is applied', () => {
      then('it should return the template content', async () => {
```

---

## found issues

none. all code adheres to mechanic role standards:

| category | violations | status |
|----------|------------|--------|
| gerunds | 0 | ✓ |
| forbidden terms | 0 | ✓ |
| comment format | 0 | ✓ |
| arrow functions | 0 | ✓ |
| test patterns | 0 | ✓ |

## why it holds

the implementation follows mechanic standards:
1. comments use `.why = ` format (not gerunds)
2. declapract files use arrow functions with (contents, context)
3. test file uses given/when/then from test-fns
4. no forbidden terms or buzzwords
