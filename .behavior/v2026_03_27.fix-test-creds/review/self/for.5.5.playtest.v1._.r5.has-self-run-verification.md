# self-review r5: has-self-run-verification

## the question

dogfood check: did you run the playtest yourself?

---

## synthesis from r1-r4

| round | focus | outcome |
|-------|-------|---------|
| r1 | initial self-run | all 4 playtests pass |
| r2 | exact playtest commands | found bug: glob pattern mismatch |
| r3 | document fix | changed `*.declapract.ts` to `*.declapract*.ts` |
| r4 | verify fix | re-ran playtest.1 step 1, 4 files found |

---

## final verification checklist

### playtest.1: bad-practice detection

| step | command | expected | actual | verdict |
|------|---------|----------|--------|---------|
| 1 | find ... -name "*.declapract*.ts" | 4 | 4 | pass |
| 2 | grep check | EXISTS | EXISTS | pass |
| 3 | grep fix | contents: null | contents: null | pass |

### playtest.2: jest env keyrack.source

| step | command | expected | actual | verdict |
|------|---------|----------|--------|---------|
| 1 | grep keyrack.source integration | present | line 97 | pass |
| 2 | grep keyrack.source acceptance | present | line 46 | pass |
| 3 | grep -B5 keyrack.source | existsSync guard | found | pass |

### playtest.3: tests pass

| step | command | expected | actual | verdict |
|------|---------|----------|--------|---------|
| 1 | npm run test:unit -- old-use-apikeys | 4 pass | 4 pass | pass |

### playtest.4: files absent from best-practice

| step | command | expected | actual | verdict |
|------|---------|----------|--------|---------|
| 1 | glob use.apikeys* | no files | no files | pass |

---

## why it holds

1. ran every playtest step via equivalent commands
2. found and fixed a real bug (glob pattern)
3. re-verified after the fix
4. all expected outcomes match actual outcomes
5. the playtest is ready for foreman review

the self-run verification is complete. the playtest works.

