# review.self: has-snap-changes-rationalized (r6)

## question: is every .snap file change intentional and justified?

### what .snap files changed?

| file | change | rationale needed? |
|------|--------|-------------------|
| `.test.yml.declapract.test.ts.snap` | deleted | yes |
| `test.yml.declapract.test.ts.snap` | deleted | yes |
| `publish.yml.declapract.test.ts.snap` | deleted | yes |
| `deploy.yml.declapract.test.ts.snap` | deleted | yes |

### why were these deleted?

the related test files were also deleted:

| test file | deleted? | why |
|-----------|----------|-----|
| `test.yml.declapract.test.ts` | yes | tested buildExpectedContent (removed) |
| `publish.yml.declapract.test.ts` | yes | tested buildExpectedContent (removed) |
| `deploy.yml.declapract.test.ts` | yes | tested buildExpectedContent (removed) |
| `.test.yml.declapract.test.ts` | modified | kept, but snapshots no longer needed |

### what did these snapshots capture?

the deleted tests snapshotted the output of `buildExpectedContent`, which:
1. parsed keyrack slugs to extract key names
2. built secrets declaration blocks for workflow_call
3. built env blocks for test jobs

this behavior was deleted. the firewall now handles it at runtime.

### is this intentional?

**yes.**

| question | answer |
|----------|--------|
| was this change intended? | yes — part of firewall migration |
| what is the rationale? | buildExpectedContent deleted, snapshots orphaned |
| is this a regression? | no — the behavior moved to firewall |

### what about `.test.yml.declapract.test.ts.snap`?

this snapshot was deleted because the test was simplified:

**before**: test called buildExpectedContent and snapshotted the result
**after**: test verifies fix returns template (no dynamic output to snapshot)

the template IS the expected output. a snapshot would duplicate the template file.

---

## found issues

none.

## why it holds

### deletions follow code deletions

each deleted snapshot belongs to a deleted test file. the test files were deleted because the function they tested (buildExpectedContent) was deleted.

this is proper cleanup: orphan snapshots removed with orphan tests.

### no regressions

| concern | assessment |
|---------|------------|
| output format degraded | no — output moved to firewall |
| error messages less helpful | n/a — no error paths in templates |
| flaky timestamps/ids | n/a — templates are static |
| extra output unintentionally | n/a — output is template content |

### bulk deletion is justified

the guide forbids "bulk snapshot updates without review." but this is not a bulk update — it's a bulk delete as part of a function removal.

the deletions are:
- intentional (function removed)
- complete (all related snapshots removed)
- documented (in this review)

### conclusion

all snapshot deletions are intentional. they track the deletion of buildExpectedContent and its tests. no orphan snapshots remain. no behavior was lost — it moved to firewall.

