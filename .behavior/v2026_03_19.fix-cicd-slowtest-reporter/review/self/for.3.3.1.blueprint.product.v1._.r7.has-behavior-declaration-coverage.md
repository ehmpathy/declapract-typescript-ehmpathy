# self-review r7: has-behavior-declaration-coverage (line by line)

## vision line-by-line trace

### vision: "the outcome world" section

| vision statement | blueprint trace | covered? |
|------------------|----------------|----------|
| "integration tests run, some take 30+ seconds, nobody notices" → visible | reporters array with slowtest reporter | yes |
| "slow tests (>10s) are immediately visible in terminal output" | `slow: '10s'` option in reporter config | yes |
| "json report written to `.slowtest/integration.report.json`" | `output: '.slowtest/integration.report.json'` option | yes |
| "teams can spot the worst offenders at a glance" | terminal output from reporter | yes |

### vision: implementation summary

| file listed | blueprint filediff tree | covered? |
|-------------|------------------------|----------|
| `src/practices/tests/best-practice/jest.integration.config.ts` | `[~] jest.integration.config.ts` | yes |
| `src/practices/git/best-practice/.gitignore.declapract.ts` | `[~] .gitignore.declapract.ts` | yes |
| `src/practices/tests/best-practice/package.json` | `[~] package.json` | yes |

### vision: exact config change

**vision specifies:**
```ts
reporters: [
  ['default', { summaryThreshold: 0 }],
  [
    'test-fns/slowtest.reporter.jest',
    { slow: '10s', output: '.slowtest/integration.report.json' },
  ],
],
```

**blueprint codepath:**
```
├── [~] reporters array
│   ├── [○] default reporter (summaryThreshold: 0)
│   └── [+] slowtest reporter
│       ├── [+] slow: '10s'
│       └── [+] output: '.slowtest/integration.report.json'
```

**line-by-line:**
- `['default', { summaryThreshold: 0 }]` — retained, marked as `[○]`
- `'test-fns/slowtest.reporter.jest'` — added, marked as `[+]`
- `slow: '10s'` — added, marked as `[+]`
- `output: '.slowtest/integration.report.json'` — added, marked as `[+]`

all four lines covered.

---

## criteria line-by-line trace

### usecase.1: spot slow integration tests locally

| criterion line | blueprint coverage |
|----------------|-------------------|
| "given a project with declapract best practices applied" | jest.integration.config.ts best practice | yes |
| "when developer runs integration tests" | reporter runs automatically | yes |
| "then a slowtest report appears in terminal" | test-fns reporter terminal output | yes |
| "then report shows file paths, describe blocks, durations in tree format" | test-fns reporter feature | yes |
| "then slow tests are marked with visual indicator" | test-fns reporter [SLOW] marker | yes |

### usecase.2: track slow tests over time

| criterion line | blueprint coverage |
|----------------|-------------------|
| "when developer runs integration tests" | reporter runs automatically | yes |
| "then json report is written to `.slowtest/integration.report.json`" | output config option | yes |
| "when developer runs git status after tests" | .gitignore handles this | yes |
| "then the file is ignored" | ignoresSortable entry | yes |

### usecase.3: receive slowtest reporter via declapract upgrade

| criterion line | blueprint coverage |
|----------------|-------------------|
| "when developer runs npx declapract apply" | best practice template applied | yes |
| "then jest.integration.config.ts includes slowtest reporter" | filediff: [~] jest.integration.config.ts | yes |
| "then .gitignore includes entry" | filediff: [~] .gitignore.declapract.ts | yes |

---

## gaps found

none. traced every line from vision and criteria to blueprint.

## why it holds

1. **vision outcome statements:** all 4 outcomes map to blueprint codepath
2. **vision implementation summary:** all 3 files in blueprint filediff tree
3. **vision exact config:** all 4 lines of config in blueprint codepath
4. **criteria usecase.1:** all 5 thens satisfied by reporter features
5. **criteria usecase.2:** all 4 thens satisfied by output config + gitignore
6. **criteria usecase.3:** all 3 thens satisfied by best practice files

every requirement traced line-by-line. no gaps.
