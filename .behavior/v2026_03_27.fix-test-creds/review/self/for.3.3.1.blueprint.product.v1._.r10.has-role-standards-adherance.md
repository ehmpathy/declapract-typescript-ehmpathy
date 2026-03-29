# self-review r10: has-role-standards-adherance

verified fix from r9 was applied. continued deep review for additional issues.

## verification: r9 fix applied

**r9 found**: fix function signature omitted params on line 113.

**fix applied**: updated blueprint line 113 from `() =>` to `(contents, context) =>`.

**verified**: read blueprint after edit, line 113 now reads:
```typescript
export const fix: FileFixFunction = (contents, context) => {
```

fix confirmed.

---

## continued line-by-line review

### lines 170-172: map callback

**code**:
```typescript
const secretsBlock = keyrackVars
  .map((key) => `      ${key}: \${{ secrets.${key} }}`)
  .join('\n');
```

**standard**: code.prod/evolvable.procedures/rule.require.arrow-only

**verdict**: pass. uses arrow function in .map() callback.

### lines 175-178: regex pattern

**code**:
```typescript
const result = input.template.replace(
  /(uses: \.\/\.github\/workflows\/\.test\.yml\n(?:    if: [^\n]+\n)?    with:\n(?:      [^\n]+\n)+)/g,
  `$1    secrets:\n${secretsBlock}\n`,
);
```

**standard**: code.prod/readable.narrative/rule.prefer.transformers-over-conditionals

**observed**: complex regex for workflow template manipulation.

**why it holds**: this is a text transformation, not conditional logic. regex is the correct tool for pattern match and replace in yaml templates. the pattern is commented (line 174) with its intent. alternative approaches (parse yaml, modify ast, serialize) would be more complex.

### lines 188-192: package.json diff

**code**:
```diff
- "test:auth": "...",
- "test": "... eval $(ECHO=true npm run --silent test:auth) && ...",
+ "test": "set -eu && npm run test:commits && npm run test:types && ...",
```

**standard**: code.prod/pitofsuccess.errors/rule.require.fail-fast

**issue found**: the diff uses `...` as elision which obscures actual command content. the `set -eu` prefix is correct for fail-fast, but the full command structure should be shown.

**however**: this is a diff that shows the change pattern, not the full content. the actual declapract package.json template defines the full command. the diff correctly shows:
1. removal of test:auth
2. removal of eval source pattern
3. add of set -eu prefix

**verdict**: pass. diff format is intentional to show change pattern.

### lines 86-104: keyrack block structure

**code**:
```typescript
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { keyrack } from 'rhachet/keyrack';

/**
 * .what = source credentials from keyrack for test env
 * .why = auto-inject keys into process.env, fail fast if absent
 */
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath)) {
  keyrack.source({
    env: 'test',
    owner: 'ehmpath',
    mode: 'strict',
  });
}
```

**standards checked**:

| standard | line | verdict |
|----------|------|---------|
| rule.require.arrow-only | n/a | pass (no functions) |
| rule.prefer.lowercase | 93-95 | pass |
| rule.require.what-why-headers | 92-95 | pass |
| rule.require.fail-fast | 97 | pass (guard check) |
| lang.terms/rule.forbid.gerunds | all | pass |
| lang.terms/rule.require.ubiqlang | all | pass (keyrack, source) |

**verdict**: pass. all standards satisfied.

### lines 120-135: test file pattern

**code**:
```typescript
import { FileCheckType } from 'declapract';

import { check, fix } from './use.apikeys.sh.declapract';

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

**standards checked**:

| standard | line | verdict |
|----------|------|---------|
| rule.require.arrow-only | 125, 127, 130 | pass |
| rule.forbid.gerunds | all | pass |
| rule.prefer.lowercase | all | pass |

**observed**: test description "should check for file existence" uses "should" prefix.

**why it holds**: this is jest convention for it() blocks. the "should" prefix is standard practice for test descriptions across the codebase.

---

## additional standards not yet checked

### lang.terms/rule.require.treestruct

**standard**: mechanisms use [verb][...noun] pattern.

**blueprint names**:
- `keyrack.source()` - verb is `source`, noun is implicit in keyrack namespace
- `buildWorkflowSecretsBlock` - verb is `build`, noun is `WorkflowSecretsBlock`
- `fix` - verb matches FileFixFunction convention

**verdict**: pass. all names follow treestruct pattern.

### code.prod/evolvable.architecture/rule.require.bounded-contexts

**standard**: domains own their logic, no reach-in.

**blueprint scope**:
- tests practice owns jest env files
- cicd-common practice owns apikeys files
- utils owns buildWorkflowSecretsBlock

**verdict**: pass. changes are scoped to appropriate practices.

### code.prod/pitofsuccess.procedures/rule.require.immutable-vars

**standard**: use const, no let or var.

**blueprint code scan**:
- line 96: `const keyrackYmlPath`
- line 155: `const keyrackYmlPath`
- line 161: `const keyrackVarsJson`
- line 162: `const keyrackVars`
- line 170: `const secretsBlock`
- line 175: `const result`

**verdict**: pass. all variables use const.

---

## issues found and fixed

### issue 1 (from r9): fix function signature

**found in r9**: line 113 omitted params.

**fixed**: updated to `(contents, context) =>`.

**verified**: blueprint now correct.

---

## non-issues verified

### non-issue 1: complex regex

**observed**: line 176 has multi-part regex.

**why it holds**: regex is correct tool for yaml template manipulation. pattern is commented. parse of yaml would be more complex.

### non-issue 2: package.json diff elision

**observed**: diff uses `...` elision.

**why it holds**: diff shows change pattern, not full content. actual template in declapract defines full command.

### non-issue 3: test "should" prefix

**observed**: test descriptions use "should check...", "should return...".

**why it holds**: jest convention for it() blocks. matches extant test files.

### non-issue 4: describe/it pattern (reiterate from prior reviews)

**observed**: test uses describe/it not given/when/then.

**why it holds**: declapract test convention for simple check/fix tests.

---

## summary

| category | count |
|----------|-------|
| rule directories checked | 7 |
| standards verified | 12 |
| lines reviewed | 218 |
| issues found | 1 (from r9) |
| issues fixed | 1 (verified in r10) |
| non-issues verified | 4 |

r9 fix verified. no additional issues found. blueprint adheres to all mechanic role standards.
