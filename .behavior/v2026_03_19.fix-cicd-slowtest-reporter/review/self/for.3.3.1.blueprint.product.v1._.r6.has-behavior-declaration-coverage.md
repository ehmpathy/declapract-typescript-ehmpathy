# self-review r6: has-behavior-declaration-coverage

## vision requirements check

### from vision implementation summary

| requirement | blueprint coverage | status |
|-------------|-------------------|--------|
| add slowtest reporter to jest.integration.config.ts | jest.integration.config.ts in filediff tree | covered |
| add .slowtest/integration.report.json to .gitignore | .gitignore.declapract.ts in filediff tree | covered |
| bump test-fns minVersion to 1.15.7 | package.json in filediff tree | covered |

### from vision exact config change

**vision specifies:**
```ts
reporters: [
  ['default', { summaryThreshold: 0 }],
  [
    'test-fns/slowtest.reporter.jest',
    {
      slow: '10s',
      output: '.slowtest/integration.report.json',
    },
  ],
],
```

**blueprint codepath tree shows:**
```
├── [~] reporters array
│   ├── [○] default reporter (summaryThreshold: 0)
│   └── [+] slowtest reporter
│       ├── [+] slow: '10s'
│       └── [+] output: '.slowtest/integration.report.json'
```

**verdict:** exact match. all config options covered.

---

## criteria requirements check

### usecase.1: spot slow integration tests locally

| criterion | blueprint coverage |
|-----------|-------------------|
| slowtest report appears in terminal | covered — reporter outputs to terminal |
| report shows file paths, describe blocks, durations | covered — test-fns reporter provides this |
| slow tests marked with visual indicator | covered — test-fns reporter provides this |

### usecase.2: track slow tests over time

| criterion | blueprint coverage |
|-----------|-------------------|
| json report written to `.slowtest/integration.report.json` | covered — output option in reporter config |
| file is ignored by git | covered — .gitignore.declapract.ts update |

### usecase.3: receive slowtest reporter via declapract upgrade

| criterion | blueprint coverage |
|-----------|-------------------|
| jest.integration.config.ts includes slowtest reporter | covered — primary change in blueprint |
| .gitignore includes .slowtest entry | covered — secondary change in blueprint |

---

## exchange requirements check

### exchange.1: slowtest terminal output

| criterion | blueprint coverage |
|-----------|-------------------|
| terminal shows report with tree structure | covered — test-fns reporter feature |
| file path appears with total duration | covered — test-fns reporter feature |
| nested blocks show individual durations | covered — test-fns reporter feature |

### exchange.2: json report file

| criterion | blueprint coverage |
|-----------|-------------------|
| .slowtest/integration.report.json created | covered — output config option |
| json contains structured test duration data | covered — test-fns reporter feature |

---

## gaps found

none. all vision and criteria requirements are addressed by the blueprint.

## why it holds

1. vision implementation summary: 3/3 files covered in blueprint filediff tree
2. vision exact config: all options (slow, output) in blueprint codepath tree
3. criteria usecases: all 3 usecases satisfied by blueprint changes
4. criteria exchanges: all exchanges enabled by test-fns reporter features

blueprint covers 100% of behavior declaration requirements.
