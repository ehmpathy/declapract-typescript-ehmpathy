# self-review r4: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

## backcompat concerns scrutinized

### concern 1: existsSync check for keyrack.yml

**code from blueprint**:
```typescript
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath)) {
  keyrack.source({...});
}
```

**question**: did the wisher explicitly request this check?

**search of criteria**: usecase.1 says "given('no keyrack.yml exists in repo') when('developer runs npm run test:integration') then('tests execute without credential check')"

**analysis**: criteria explicitly requires repos without keyrack.yml to run tests without credential check. the existsSync check implements this exact requirement.

**verdict**: not backcompat — explicitly requested in criteria.

---

### concern 2: rhachet prereq requirement

**question**: should repos without rhachet still work?

**search of vision**: "what is awkward" section says "repos without rhachet would break after declapract fix (need migration guidance)"

**search of open questions resolved**: "repos without rhachet | require rhachet as prereq; import fails if absent"

**analysis**: vision explicitly resolves that rhachet is a prereq. if absent, the static import fails immediately. this is the intended behavior.

**verdict**: not backcompat — explicitly resolved in vision as prereq requirement.

---

### concern 3: ci workflow env var precedence

**question**: does keyrack.source() preserve ci compatibility?

**search of criteria**: usecase.3 says "given('env vars are set in ci workflow') when('ci runs npm run test:integration') then('tests execute with credentials from env vars')" and "given('keyrack.yml exists but env vars are set') when('ci runs npm run test:integration') then('env vars take precedence')"

**search of wish**: says "ci uses env vars directly — keyrack.source checks process.env first"

**analysis**: keyrack.source() already checks process.env before vault. ci sets env vars via secrets. this is documented behavior of keyrack, not backcompat we added.

**verdict**: not backcompat — native keyrack behavior, explicitly documented in wish and criteria.

---

### concern 4: bad-practice migration for old files

**question**: is the bad-practice just for backcompat?

**search of wish**: says "delete legacy files" with list that contains use.apikeys.sh and use.apikeys.json

**search of criteria**: usecase.4 says "given('repo has use.apikeys.sh and use.apikeys.json in .agent/') when('developer runs declapract fix') then('use.apikeys files are removed')"

**analysis**: wish explicitly says delete legacy files. criteria explicitly requires declapract fix to remove them. bad-practice implements the migration, not backcompat.

**verdict**: not backcompat — explicitly requested migration mechanism.

---

## issues found and fixed

none found. all potential backcompat concerns trace to explicit requirements in wish, vision, or criteria.

---

## non-issues verified

### non-issue 1: existsSync check for keyrack.yml

**why it holds**: criteria explicitly requests "tests execute without credential check" if no keyrack.yml.

### non-issue 2: rhachet prereq requirement

**why it holds**: vision explicitly resolves "require rhachet as prereq; import fails if absent".

### non-issue 3: ci env var precedence

**why it holds**: native keyrack behavior, documented in wish and criteria.

### non-issue 4: bad-practice migration

**why it holds**: wish says "delete legacy files", criteria specifies declapract fix behavior.

---

## summary

| category | count |
|----------|-------|
| concerns scrutinized | 4 |
| backcompat violations found | 0 |
| backcompat violations fixed | 0 |
| non-issues verified | 4 |

blueprint contains no unnecessary backwards compatibility. all protective checks trace to explicit requirements.
