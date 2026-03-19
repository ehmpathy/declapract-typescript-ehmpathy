# self-review r1: has-questioned-deletables

## component.1: jest.integration.config.ts update

**can this be removed entirely?**
no — this is the core deliverable. the slowtest reporter must be added to the config.

**if we deleted this and had to add it back, would we?**
yes — this is the primary mechanism for slow test visibility.

**what is the simplest version that works?**
the proposed change is minimal: add one reporter entry to the extant reporters array.

**verdict:** retain

---

## component.2: .gitignore.declapract.ts update

**can this be removed entirely?**
no — without this, the `.slowtest/integration.report.json` file would be accidentally committed.

**if we deleted this and had to add it back, would we?**
yes — the wish explicitly requires the gitignore entry (per rhachet-roles-ehmpathy reference).

**what is the simplest version that works?**
add one string to ignoresSortable array. simplest possible.

**verdict:** retain

---

## component.3: package.json test-fns minVersion bump

**can this be removed entirely?**
no — the slowtest reporter was added in test-fns 1.15.0. the extant minVersion (1.7.2) does not include it.

**if we deleted this and had to add it back, would we?**
yes — without this, projects would fail to import the reporter.

**what is the simplest version that works?**
bump the minVersion check from 1.7.2 to 1.15.7. one line change.

**verdict:** retain

---

## summary

all three components are essential and minimal. no deletables found.

| component | question | answer |
|-----------|----------|--------|
| jest.integration.config.ts | deletable? | no — core deliverable |
| .gitignore.declapract.ts | deletable? | no — prevents accidental commits |
| package.json minVersion | deletable? | no — required for reporter availability |
