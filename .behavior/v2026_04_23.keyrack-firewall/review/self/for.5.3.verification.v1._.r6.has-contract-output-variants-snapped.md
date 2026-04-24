# review.self: has-contract-output-variants-snapped (r6)

## deeper reflection — should there be a snapshot?

the guide warns: "if you find yourself about to say 'this variant isn't worth a snapshot' — stop."

i said "no snapshot needed." let me steelman the contrary view.

### case for a snapshot

| argument | weight |
|----------|--------|
| makes test file self-contained | low — template is in same directory |
| future developers see expected output inline | low — they can read the template |
| snapshot diff clearer than template diff | medium — snapshots highlight what changed |
| independent verification | medium — snapshot is separate from source |

### case against a snapshot

| argument | weight |
|----------|--------|
| double maintenance burden | high — two files to update |
| template IS the source of truth | high — snapshot would duplicate it |
| template diff already shows in PR | high — git handles this |
| declapract compares files, not snapshots | high — runtime validates the template |

### what does "snapshot" mean for declapract?

declapract templates are **declarative specifications**. they describe what files SHOULD look like.

the "output" of a declapract fix is: the template content, unchanged.

a snapshot would snapshot... the template. which is already in git.

this is different from:
- CLI commands → stdout varies based on input
- API endpoints → response varies based on request
- SDK methods → return varies based on arguments

the template does not vary. it is static. the template file IS the snapshot.

### would a snapshot catch bugs?

| bug type | template catches? | snapshot catches? |
|----------|------------------|-------------------|
| malformed YAML | no (static file) | no (same content) |
| wrong content | yes (git diff) | yes (snapshot diff) |
| accidental change | yes (git diff) | yes (snapshot diff) |

a snapshot adds no detection power that the template doesn't already have.

---

## found issues

none.

## why it holds

### the template file IS exhaustive

the template file in git serves the same purpose as a snapshot:
- visible in PR diffs
- reviewers see exact output
- changes surface immediately

### declapract is declarative, not procedural

traditional snapshots capture output of a procedure. declapract templates are not procedures — they are declarations. the "output" is the declaration itself.

### a snapshot addition would violate DRY

the template and snapshot would contain identical content. any change requires two edits. this is maintenance burden with no benefit.

### conclusion

for procedural code with variable output: snapshots required.
for declarative templates with static content: the template IS the snapshot.

this PR modifies templates. the templates are in git. they serve as their own snapshots. no additional snapshot tests needed.

