# self-review r5: has-consistent-conventions

## name conventions analysis

### convention.1: output file path

**our choice:**
```
.slowtest/integration.report.json
```

**extant patterns in codebase:**
```
.artifact/          # build artifacts
.temp/              # temporary files
coverage/           # test coverage reports
```

**analysis:**
- dot-prefix directories: `.artifact`, `.temp` — we use `.slowtest` (consistent)
- subdirectory name: clear purpose (slowtest)
- file name: `{scope}.report.json` — clear, descriptive

**verdict:** consistent with dot-prefix directory convention.

---

### convention.2: reporter configuration

**our choice:**
```ts
['test-fns/slowtest.reporter.jest', { slow: '10s', output: '...' }]
```

**extant patterns:**
```ts
['default', { summaryThreshold: 0 }]
```

**analysis:**
- tuple format `[path, options]` — matches extant
- option keys are lowercase — matches extant `summaryThreshold`
- option values use appropriate types — string for duration, string for path

**verdict:** consistent with jest reporter tuple convention.

---

### convention.3: gitignore entry format

**our choice:**
```
.slowtest/integration.report.json
```

**extant patterns in ignoresSortable:**
```
*.log
*.tsbuildinfo
.artifact
.env
.serverless
coverage
dist
```

**analysis:**
- specific file path (not glob) — appropriate for known output location
- dot-prefix directory — matches `.artifact`, `.env`, etc.
- full path with extension — explicit, no ambiguity

**verdict:** consistent with specific ignore entry convention.

---

### convention.4: package.json minVersion syntax

**our choice:**
```json
"test-fns": "@declapract{check.minVersion('1.15.7')}"
```

**extant patterns:**
```json
"jest": "@declapract{check.minVersion('30.2.0')}"
"typescript": "@declapract{check.minVersion('5.0.0')}"
```

**analysis:**
- same directive syntax
- same version format (semver)
- same key-value structure

**verdict:** consistent with minVersion check convention.

---

## terms and namespace check

| our term | extant term | consistent? |
|----------|-------------|-------------|
| slowtest | (new, from test-fns) | yes - package's own term |
| integration | integration (in jest.integration.config.ts) | yes |
| report | (common term) | yes |
| reporters | reporters (extant in all jest configs) | yes |

no new terms introduced. all terms from test-fns package or extant codebase.

---

## structure check

| blueprint structure | extant structure | consistent? |
|--------------------|------------------|-------------|
| add to reporters array | reporters array exists | yes |
| add to ignoresSortable | ignoresSortable array exists | yes |
| update devDependencies | devDependencies section exists | yes |

no new structures. all changes fit extant patterns.

---

## conclusion

all name choices consistent with extant conventions:
- dot-prefix directories
- jest reporter tuple format
- gitignore entry format
- minVersion check syntax

no divergence found. no refactor needed.
