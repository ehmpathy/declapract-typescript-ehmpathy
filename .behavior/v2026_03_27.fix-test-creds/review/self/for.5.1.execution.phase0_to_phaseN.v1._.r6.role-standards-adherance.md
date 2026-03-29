# self-review r6: role-standards-adherance

## relevant rule directories

the changed files are primarily:
- jest.integration.env.ts (test setup)
- jest.acceptance.env.ts (test setup)
- buildWorkflowSecretsBlock.ts (utility function)
- package.json (scripts)
- .test.yml (ci workflow)
- bad-practice .declapract.ts files

**applicable briefs categories:**

1. `code.prod/evolvable.procedures/` - function patterns
2. `code.prod/pitofsuccess.errors/` - error flow
3. `code.prod/readable.comments/` - jsdoc
4. `code.prod/readable.narrative/` - code flow
5. `code.test/` - test patterns
6. `lang.terms/` - name conventions
7. `lang.tones/` - style

---

## file-by-file standards check

### jest.integration.env.ts

**rule.require.input-context-pattern:**
- n/a: keyrack.source() is a library call, not a procedure we define
- holds

**rule.require.what-why-headers:**
- jsdoc present at lines 88-93:
  ```typescript
  /**
   * .what = source credentials from keyrack for test env
   * .why =
   *   - auto-inject keys into process.env
   *   - fail fast with helpful error if keyrack locked or keys absent
   */
  ```
- follows `.what` and `.why` format
- holds

**rule.require.narrative-flow:**
- code is flat, no nested branches
- single if statement with early action
- no else branches
- holds

**rule.require.fail-fast:**
- keyrack.source() with mode: 'strict' throws on locked/absent
- existsSync check prevents error when keyrack.yml absent
- fail-fast on credential issues
- holds

**rule.forbid.gerunds:**
- no gerunds in code or comments
- holds

---

### jest.acceptance.env.ts

**same checks as integration:**
- jsdoc: present at lines 38-43, matches format
- narrative flow: flat, no nested structure
- fail-fast: keyrack.source({ mode: 'strict' })
- no gerunds
- holds

---

### buildWorkflowSecretsBlock.ts

**rule.require.input-context-pattern:**
```typescript
export const buildWorkflowSecretsBlock = async (
  input: { template: string },
  context: { getProjectRootDirectory: () => string },
): Promise<string>
```
- uses (input, context) pattern
- input is object with named properties
- context contains dependencies
- holds

**rule.require.what-why-headers:**
```typescript
/**
 * .what = builds workflow content with keyrack secrets block for .test.yml
 * .why = single source of truth for test.yml, publish.yml, deploy.yml check+fix
 */
```
- .what and .why present
- holds

**rule.require.arrow-only:**
- uses arrow function syntax
- no function keyword
- holds

**rule.forbid.as-cast:**
- one cast: `as KeyrackGrantAttempt[]`
- at external org code boundary (rhachet sdk)
- documented with comment about union variants
- acceptable per exception rule
- holds

**rule.require.narrative-flow:**
- flat structure with early returns
- no nested branches
- code paragraphs with inline comments
- holds

---

### package.json (tests best-practice)

**rule.require.safe-shell-vars:**
```json
"test:unit": "set -eu && jest ... $([ -n \"${CI:-}\" ] && echo '--ci') $([ -z \"${THOROUGH:-}\" ] && echo '--changedSince=main')"
```
- uses `${CI:-}` and `${THOROUGH:-}` and `${RESNAP:-}` syntax
- all env vars use `:-` default syntax
- `set -eu` at start for fail-fast
- holds

---

### bad-practice .declapract.ts files

**rule.require.arrow-only:**
```typescript
export const fix: FileFixFunction = () => {
  return { contents: null };
};
```
- arrow function syntax
- holds

**rule.require.single-responsibility:**
- each file has one check and one fix
- holds

**rule.forbid.gerunds:**
- no gerunds in code
- holds

---

### .test.yml workflow

**yaml files not subject to typescript rules, but:**

**ci step name convention:**
- `prepare:rhachet` is noun:noun, not gerund
- holds

**command structure:**
- `npm run prepare:rhachet --if-present`
- uses `--if-present` for optional dependency
- holds

---

## standards violations found

none.

---

## summary

reviewed 6 changed file groups against mechanic briefs:

| file | patterns checked | violations |
|------|------------------|------------|
| jest.integration.env.ts | jsdoc, narrative, fail-fast | none |
| jest.acceptance.env.ts | jsdoc, narrative, fail-fast | none |
| buildWorkflowSecretsBlock.ts | input-context, jsdoc, arrow-only, as-cast | none |
| package.json | safe-shell-vars | none |
| bad-practice .declapract.ts | arrow-only, single-responsibility | none |
| .test.yml | name convention | none |

all code follows mechanic role standards.

