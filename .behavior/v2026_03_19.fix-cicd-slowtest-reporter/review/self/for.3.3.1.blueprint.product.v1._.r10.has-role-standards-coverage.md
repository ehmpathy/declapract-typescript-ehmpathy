# self-review r10: has-role-standards-coverage (with file evidence)

## read actual files to verify

read `src/practices/tests/best-practice/jest.integration.config.ts` to verify what patterns exist.

---

## extant file patterns

**file structure:**
```ts
// 1. jsdoc loader directive
/**
 * @jest-config-loader esbuild-register
 */

// 2. type import
import type { Config } from 'jest';

// 3. env setup
process.env.TZ = 'UTC';
process.env.FORCE_COLOR = 'true';

// 4. config declaration with inline comments
const config: Config = {
  verbose: true,
  reporters: [['default', { summaryThreshold: 0 }]], // inline comment
  // ... more options
};

// 5. default export
export default config;
```

---

## patterns present in extant file

| pattern | present in extant file? | covered in blueprint? |
|---------|------------------------|----------------------|
| jsdoc loader directive | yes (line 1-3) | not changed |
| type import | yes (line 4) | not changed |
| env setup | yes (lines 7, 10) | not changed |
| inline comment on config | yes (line 15) | could add comment |
| default export | yes (line 37) | not changed |

---

## gap found: inline comment

**extant pattern:**
```ts
reporters: [['default', { summaryThreshold: 0 }]], // ensure we always get a failure summary at the bottom
```

**blueprint currently says:**
```
[+] slowtest reporter
    ├── [+] slow: '10s'
    └── [+] output: '.slowtest/integration.report.json'
```

**should we add a comment?**

considered: the extant file has inline comments that explain why options exist.

decision: the slowtest reporter is self-evident. a comment like "// surface slow tests" would be redundant. the option name `slowtest` already conveys purpose.

**verdict:** no comment needed. the pattern of "comment when not obvious" is followed.

---

## other patterns checked

### jest config completeness

| config option | purpose | needed for slowtest? |
|--------------|---------|---------------------|
| verbose | show test names | no change needed |
| testEnvironment | node | no change needed |
| moduleFileExtensions | extensions to process | no change needed |
| moduleNameMapper | path aliases | no change needed |
| transform | transpilation | no change needed |
| testMatch | file patterns | no change needed |
| setupFilesAfterEnv | env setup | no change needed |
| maxWorkers | parallelism | no change needed |
| reporters | **we add here** | slowtest added |

all other options remain unchanged. only reporters array modified.

---

## conclusion

all required patterns present. the only potential gap (inline comment) is not needed because the slowtest reporter is self-evident.

## why it holds

1. **jsdoc loader:** present, not modified
2. **type import:** present, not modified
3. **env setup:** present, not modified
4. **inline comments:** present where needed; slowtest is self-evident
5. **default export:** present, not modified
6. **config structure:** all extant options preserved
7. **reporters array:** only place we modify, follows extant tuple format

blueprint covers all applicable patterns. no gaps found.
