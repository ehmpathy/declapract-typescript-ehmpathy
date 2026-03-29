# self-review: has-questioned-deletables

question each feature and component in the blueprint for necessity.

## features traced

### feature 1: delete use.apikeys.sh and use.apikeys.json

**traces to**: wish line "delete legacy files", vision "what is awkward" section

**verdict**: required. wish explicitly says delete.

---

### feature 2: update jest env files to use keyrack.source()

**traces to**: wish handoff step 3 and 4, vision "day-in-the-life: after", criteria usecase.1 and usecase.2

**verdict**: required. core functionality of the migration.

---

### feature 3: remove test:auth from package.json

**traces to**: wish handoff step 5, vision "declapract scope" table

**verdict**: required. explicitly stated in wish.

---

### feature 4: create bad-practice to migrate repos with old pattern

**traces to**: criteria usecase.4 "declapract fix is run on repo with old pattern"

**verdict**: required. without bad-practice, declapract won't detect and fix legacy files.

---

### feature 5: update workflow declapract files to read from keyrack.yml

**traces to**: vision "ci compatibility" section, criteria usecase.3 "ci runs tests"

**verdict**: required. ci needs secrets injected from keyrack.yml keys.

---

### feature 6: readKeyrackConfig utility

**traces to**: pattern 5 in prod research "[REPLACE]", pattern 6 "[EXTEND]"

**verdict**: required. buildWorkflowSecretsBlock and .test.yml.declapract need to read keyrack.yml.

---

## components questioned

### component 1: yaml package dependency

**can we delete it?**: no. keyrack.yml is yaml format, not json.

**simplest version**: use yaml package. it's already a common dependency.

**verdict**: required.

---

### component 2: bad-practice for use.apikeys.sh AND use.apikeys.json separately

**can we combine into one bad-practice?**: no. each file needs its own .declapract.ts to detect and delete.

**verdict**: keep separate. declapract requires one file per pattern.

---

### component 3: buildWorkflowSecretsBlock utility

**can we delete it?**: no. it's used by test.yml, publish.yml, deploy.yml declapract files.

**simplest version**: extend to read keyrack config instead of use.apikeys config.

**verdict**: extend, not delete.

---

### component 4: readUseApikeysConfig utility

**can we keep and extend?**: no. the shape changes from `{ apikeys: { required: [] } }` to `{ env: { test: [] } }`. cleaner to replace.

**verdict**: delete and replace with readKeyrackConfig.

---

## issues found and fixed

### issue 1: blueprint includes yaml package but doesn't verify it's needed

**what i found**: blueprint assumes yaml package is required for keyrack.yml parse.

**how i fixed**: verified keyrack.yml is yaml format. yaml package is correct choice.

**why this matters**: could have over-engineered with custom parser.

---

### issue 2: blueprint doesn't specify where bad-practice lives

**what i found**: filediff tree shows bad-practice in cicd-common, but could also live in tests practice.

**how i fixed**: kept in cicd-common since the legacy files live there.

**why this matters**: ensures bad-practice is co-located with the files it targets.

---

## non-issues that hold

### non-issue 1: separate readKeyrackConfig utility vs inline yaml.parse

**why it holds**: utility enables reuse across buildWorkflowSecretsBlock and .test.yml.declapract. single source of truth for keyrack.yml path and shape.

### non-issue 2: keyrack.source() call in jest env files vs separate bootstrap

**why it holds**: follows established pattern. jest env files already do credential checks. replacing in-place minimizes disruption.

### non-issue 3: bad-practice returns null to delete files

**why it holds**: this is the documented declapract pattern. `{ contents: null }` removes the file.

---

## deletions: none

all features trace to wish or criteria. all components are necessary.

**simplest implementation**: exactly what's in the blueprint.

