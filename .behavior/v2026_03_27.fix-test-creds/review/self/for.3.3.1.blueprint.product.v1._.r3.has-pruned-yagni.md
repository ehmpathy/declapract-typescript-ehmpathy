# self-review r3: has-pruned-yagni

deep review for extras not prescribed. line-by-line examination of blueprint.

## components scrutinized

### component 1: KeyrackConfig interface includes env.prep and env.prod

**code from blueprint** (lines 104-109):
```typescript
export interface KeyrackConfig {
  org: string;
  'env.test'?: string[];
  'env.prep'?: string[];
  'env.prod'?: string[];
}
```

**question**: are env.prep and env.prod needed?

**search of blueprint**: env.prep and env.prod are never used. only env.test is accessed.

**search of wish**: wish shows keyrack.yml example with only env.test:
```yaml
env.test:
  - YOUR_API_KEY
```

**search of criteria**: criteria only mentions "test credentials" and "env.test".

**verdict**: YAGNI violation. interface declares unused fields.

**how i fixed**: removed env.prep and env.prod from KeyrackConfig interface.

**blueprint updated**: yes.

---

### component 2: .declapract.readme.md in bad-practice

**code from blueprint** (line 36):
```
└── [+] .declapract.readme.md
```

**question**: is this file required?

**search of howto.add-bad-practice brief**: says `.declapract.readme.md` is "(optional)".

**search of wish and criteria**: no mention of readme file.

**verdict**: YAGNI violation. optional file added without requirement.

**how i fixed**: removed .declapract.readme.md from filediff tree.

**blueprint updated**: yes.

---

### component 3: async readKeyrackConfig with util.promisify

**code from blueprint**:
```typescript
export const readKeyrackConfig = async (input: {
  projectRootDirectory: string;
}): Promise<KeyrackConfig | null> => {
  const exists = await util
    .promisify(fs.access)(configPath, fs.constants.F_OK)
    ...
```

**question**: is async necessary? could this be sync?

**analysis**:
- extant readUseApikeysConfig is async — but that's not justification, could be legacy
- buildWorkflowSecretsBlock is async — but could be made sync
- declapract check/fix functions can be sync or async — both work
- sync code is simpler: no await, no util.promisify, no Promise wrapper

**simpler version**:
```typescript
export const readKeyrackConfig = (input: {
  projectRootDirectory: string;
}): KeyrackConfig | null => {
  if (!fs.existsSync(configPath)) return null;
  try {
    const contents = fs.readFileSync(configPath, 'utf-8');
    return yaml.parse(contents) as KeyrackConfig;
  } catch {
    return null;
  }
};
```

**verdict**: YAGNI violation. async adds complexity without benefit.

**how i fixed**: refactored to sync implementation. removed util import.

**blueprint updated**: yes.

---

### component 4: test coverage section

**question**: is this section needed in the blueprint?

**analysis**: test coverage is valuable but not explicitly requested in vision or criteria. however, test coverage section helps ensure test quality at implementation.

**verdict**: not YAGNI. test coverage is implicit requirement for any production change.

---

### component 5: dependencies section

**question**: is yaml package needed? could we parse keyrack.yml differently?

**alternative 1**: regex parse — fragile for yaml features like comments, multiline strings, anchors.

**alternative 2**: read as JSON — keyrack.yml is yaml, not json. incompatible.

**verdict**: yaml package is minimum viable for yaml parse. not YAGNI.

---

### component 6: codepath tree output declaration

**question**: output shows org field but is org ever used?

**analysis**: org is part of keyrack.yml structure but blueprint doesn't use it. however, the interface must match the yaml shape for yaml.parse() to work correctly.

**verdict**: not YAGNI. org is in the yaml file, must be in interface for correct parse.

---

### component 7: migration path section

**question**: is this section needed?

**analysis**: migration path helps implementers understand the expected flow. traces to criteria usecase.4 "declapract fix is run on repo with old pattern".

**verdict**: not YAGNI. migration path is implied by criteria.

---

### component 8: eslint-disable comment in jest env file

**code from blueprint**:
```typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { keyrack } = require('rhachet/keyrack');
```

**question**: is the eslint-disable comment necessary?

**analysis**: require() is used for sync import. eslint rule forbids require-imports for good reason. we use require() specifically because dynamic import is async. comment explains why we violate the rule.

**verdict**: not YAGNI. comment is necessary to suppress lint error and document rationale.

---

### component 9: input object pattern in readKeyrackConfig

**question**: is input object pattern necessary for single parameter?

**analysis**: input object pattern is per briefs: rule.require.input-context-pattern. single parameter still benefits from named key. matches extant readUseApikeysConfig signature.

**verdict**: not YAGNI. follows established pattern per briefs.

---

## issues found and fixed

### issue 1: KeyrackConfig interface declares unused fields

**what i found**: env.prep and env.prod declared but never used.

**how i fixed**: updated blueprint interface to only include env.test.

**why this matters**: interfaces should only declare what's used.

---

### issue 2: .declapract.readme.md added without requirement

**what i found**: bad-practice includes optional readme file.

**how i fixed**: removed from filediff tree.

**why this matters**: optional files become maintenance burden.

---

### issue 3: async pattern adds unnecessary complexity

**what i found**: readKeyrackConfig uses async/await and util.promisify when sync fs operations suffice.

**how i fixed**: refactored to sync implementation. removed util import.

**why this matters**: async adds cognitive load and execution overhead. sync is simpler when no true async operations are needed.

---

## non-issues verified

### non-issue 1: readKeyrackConfig utility vs inline

**why it holds**: utility is used by buildWorkflowSecretsBlock.ts and .test.yml.declapract.ts. two callers justifies extraction.

### non-issue 2: try/catch around require()

**why it holds**: wish says repos without rhachet should work. try/catch is required behavior, not defensive extra.

### non-issue 3: test files in filediff tree

**why it holds**: delete of best-practice files requires delete of their test files. tests for readKeyrackConfig are needed for the replacement utility.

### non-issue 4: eslint-disable comment

**why it holds**: documents intentional rule violation. necessary for sync require().

### non-issue 5: input object pattern

**why it holds**: follows established pattern per briefs. single parameter still benefits.

---

## summary

| category | count |
|----------|-------|
| components scrutinized | 9 |
| YAGNI violations found | 3 |
| YAGNI violations fixed | 3 |
| non-issues verified | 5 |

blueprint now contains minimum viable implementation after:
1. removal of unused env.prep/env.prod interface fields
2. removal of optional .declapract.readme.md file
3. refactor from async to sync readKeyrackConfig

