# self-review r3: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

## backcompat concerns scrutinized

### concern 1: try/catch around require('rhachet/keyrack')

**code from blueprint**:
```typescript
if (existsSync(keyrackYmlPath)) {
  try {
    const { keyrack } = require('rhachet/keyrack');
    keyrack.source({...});
  } catch {
    // rhachet not installed; skip silently since keyrack.yml exists but rhachet absent
  }
}
```

**question**: did the wisher explicitly say to maintain compatibility with repos without rhachet?

**search of wish**: vision says "repos without rhachet would break after declapract fix (need migration guidance)"

**search of vision**: open question resolved: "repos without rhachet | require rhachet as prereq; jest env file import fails if absent"

**search of criteria**: usecase.1 says "given('no keyrack.yml exists in repo') when('developer runs npm run test:integration') then('tests execute without credential check')"

**analysis**:
- vision explicitly says "require rhachet as prereq" and "import fails if absent"
- but blueprint has try/catch that silently skips
- this is backcompat we added "to be safe"

**verdict**: backcompat not explicitly requested. vision says to fail, not skip.

**how i fixed**: removed try/catch. if keyrack.yml exists but rhachet absent, require() will throw. this matches vision resolution.

**updated code**:
```typescript
if (existsSync(keyrackYmlPath)) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { keyrack } = require('rhachet/keyrack');
  keyrack.source({
    env: 'test',
    owner: 'ehmpath',
    mode: 'strict',
  });
}
```

**open question for wisher**: should repos with keyrack.yml but without rhachet fail loudly or skip silently?

---

### concern 2: existsSync check for keyrack.yml

**code from blueprint**:
```typescript
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath)) {
  // keyrack.source() call
}
```

**question**: did the wisher explicitly request this check?

**search of criteria**: usecase.1 says "given('no keyrack.yml exists in repo') when('developer runs npm run test:integration') then('tests execute without credential check')"

**analysis**: criteria explicitly says if no keyrack.yml, tests execute without credential check. the existsSync check implements this criteria requirement.

**verdict**: not backcompat — explicitly requested in criteria.

---

### concern 3: silent return null in readKeyrackConfig

**code from blueprint**:
```typescript
if (!fs.existsSync(configPath)) return null;
```

**question**: is this backcompat or explicit requirement?

**search of criteria**: usecase.3 says "given('keyrack.yml exists but env vars are set') when('ci runs npm run test:integration') then('env vars take precedence')"

**analysis**: null return when file absent is standard config-read behavior. not backcompat, just correct absent-file handle.

**verdict**: not backcompat — correct null handle for absent file.

---

### concern 4: no migration shim for old pattern

**question**: should we keep old use.apikeys.sh functional alongside new keyrack?

**search of wish**: says "delete legacy files"

**search of vision**: "what is awkward" section lists pain points of old pattern, implies we want to remove it

**analysis**: wish explicitly says delete. no migration shim requested.

**verdict**: not backcompat — wisher explicitly said to delete old pattern.

---

## issues found and fixed

### issue 1: try/catch silently skips when rhachet absent

**what i found**: blueprint adds try/catch that silently skips keyrack.source() when rhachet package not installed. this contradicts vision resolution "import fails if absent".

**how i fixed**: removed try/catch. now if keyrack.yml exists but rhachet absent, require() throws immediately. this matches vision.

**open question flagged**: wisher should confirm: fail loudly or skip silently when rhachet absent?

**why this matters**: silent skip hides configuration errors. fail loudly is clearer.

---

## non-issues verified

### non-issue 1: existsSync check for keyrack.yml

**why it holds**: criteria explicitly requests "tests execute without credential check" if no keyrack.yml. existsSync check implements this.

### non-issue 2: null return for absent config file

**why it holds**: standard behavior for config readers. not backcompat concern.

### non-issue 3: no migration shim

**why it holds**: wish explicitly says "delete legacy files". no shim requested.

---

## open questions for wisher

| question | context |
|----------|---------|
| fail loudly or skip silently when rhachet absent? | repo has keyrack.yml but rhachet not installed. vision says fail. blueprint had silent skip. i removed silent skip to match vision. confirm this is correct. |

---

## summary

| category | count |
|----------|-------|
| concerns scrutinized | 4 |
| backcompat violations found | 1 |
| backcompat violations fixed | 1 |
| non-issues verified | 3 |
| open questions for wisher | 1 |

blueprint now fails loudly when keyrack.yml exists but rhachet absent, per vision resolution.

