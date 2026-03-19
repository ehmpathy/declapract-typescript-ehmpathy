# self-review r6: has-consistent-conventions (with evidence)

## evidence gathered

searched codebase for relevant patterns. found concrete evidence of extant conventions.

---

## convention.1: dot-prefix directories

**grep evidence:**
```
.gitignore:4:.artifact
.gitignore:7:.slowtest/integration.report.json
.gitignore:8:.temp
src/practices/git/best-practice/.gitignore.declapract.ts:11:  '.artifact', // deployment artifacts
src/practices/git/best-practice/.gitignore.declapract.ts:17:  '.temp',
```

**pattern identified:**
- dot-prefix directories for generated outputs: `.artifact`, `.temp`
- this repo already uses `.slowtest` (dogfooded)

**our choice:** `.slowtest/integration.report.json`

**verdict:** consistent. follows established dot-prefix directory pattern.

---

## convention.2: reporters array tuple format

**file evidence (jest.unit.config.ts:15):**
```ts
reporters: [['default', { summaryThreshold: 0 }]], // ensure we always get a failure summary
```

**pattern identified:**
- tuple format: `[reporterName, optionsObject]`
- options use camelCase keys
- array of tuples for multiple reporters

**our choice:**
```ts
['test-fns/slowtest.reporter.jest', { slow: '10s', output: '...' }]
```

**verdict:** consistent. same tuple format, same options object structure.

---

## convention.3: ignoresSortable entry format

**file evidence (.gitignore.declapract.ts:11-17):**
```ts
const ignoresSortable = [
  // ...
  '.artifact', // deployment artifacts from `simple-artifact-builder` are produced here
  // ...
  '.temp',
].sort();
```

**pattern identified:**
- string entries in array
- dot-prefix for directories
- `.sort()` call at end
- comments optional for explanation

**our choice:** `.slowtest/integration.report.json`

**verdict:** consistent. follows same array entry format with dot-prefix.

---

## convention.4: minVersion directive

**evidence from extant package.json best practices:**
```json
"test-fns": "@declapract{check.minVersion('1.7.2')}"
```

**pattern identified:**
- exact syntax: `@declapract{check.minVersion('semver')}`
- semver string in single quotes

**our choice:**
```json
"test-fns": "@declapract{check.minVersion('1.15.7')}"
```

**verdict:** consistent. identical syntax, updated version only.

---

## terms check

| term in blueprint | source | extant usage |
|-------------------|--------|--------------|
| slowtest | test-fns package | new, but from official package |
| integration | jest.integration.config.ts | yes, established |
| report | common term | yes, standard |
| reporters | jest config | yes, from jest.unit.config.ts:15 |

no new invented terms. all terms from either test-fns package or extant codebase.

---

## structure check

| our structure | extant structure | evidence |
|--------------|------------------|----------|
| reporters array | reporters array | jest.unit.config.ts:15 |
| ignoresSortable array | ignoresSortable array | .gitignore.declapract.ts:11 |
| devDependencies object | devDependencies object | package.json best practices |

no new structures introduced.

---

## issues found

none. all conventions verified against extant codebase evidence.

## why it holds

1. dot-prefix directories: `.slowtest` matches `.artifact`, `.temp` pattern
2. reporter tuple format: matches jest.unit.config.ts exactly
3. gitignore entry: matches ignoresSortable array entries
4. minVersion syntax: identical to extant test-fns entry

blueprint is convention-consistent.
