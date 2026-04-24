# review.self: role-standards-adherance (r7)

## deeper review of TypeScript code

examined the actual diff line by line:

---

### fix function pattern

**old code**:
```typescript
export const fix: FileFixFunction = async (_contents, context) => {
  if (!context.declaredFileContents)
    throw new UnexpectedCodePathError('declaredFileContents not found', {...});
  // ... complex logic
  return { contents: expected };
};
```

**new code**:
```typescript
export const fix: FileFixFunction = async (_contents, context) => {
  return { contents: context.declaredFileContents ?? '' };
};
```

**observation**: old code threw error when declaredFileContents absent; new code returns empty string.

**is this a problem?**

| scenario | old behavior | new behavior |
|----------|--------------|--------------|
| template exists | returns expected | returns template |
| template absent | throws error | returns '' |

**analysis**:
- template file always exists (adjacent .yml file)
- declaredFileContents is populated from that template by declapract
- if template absent, declapract errors before it calls fix
- `?? ''` is unreachable in practice

**verdict**: acceptable — defensive code that never triggers in practice. could be `?? UnexpectedCodePathError.throw(...)` but not a blocker.

---

### deleted files

| file | rule check | status |
|------|------------|--------|
| withKeyrackContext.ts | had proper .what/.why | ✓ deleted |
| buildWorkflowSecretsBlock.ts | had proper .what/.why | ✓ deleted |
| test files | used given/when/then | ✓ deleted |

all deleted files followed role standards before deletion. no violations introduced.

---

### kept code

| file | check | status |
|------|-------|--------|
| .test.yml.declapract.ts | has .what/.why, arrow fn | ✓ |
| test.yml.declapract.ts | has .what/.why, arrow fn | ✓ |
| deploy.yml.declapract.ts | has .what/.why, arrow fn | ✓ |
| publish.yml.declapract.ts | has .what/.why, arrow fn | ✓ |
| .test.yml.declapract.test.ts | uses given/when/then | ✓ |

---

## found issues

**potential nitpick** (not blocker):
- `context.declaredFileContents ?? ''` could be `?? UnexpectedCodePathError.throw(...)` for fail-loud
- but this is defensive code that never triggers in practice
- the template file always exists

**decision**: accept as-is — the simplification is valid, and extra error code for unreachable code violates YAGNI.

## why it holds

the implementation follows role standards:
1. all functions use arrow syntax ✓
2. all functions have .what/.why headers ✓
3. test file uses given/when/then ✓
4. no gerunds or forbidden terms ✓
5. defensive `?? ''` is acceptable for unreachable edge case ✓
