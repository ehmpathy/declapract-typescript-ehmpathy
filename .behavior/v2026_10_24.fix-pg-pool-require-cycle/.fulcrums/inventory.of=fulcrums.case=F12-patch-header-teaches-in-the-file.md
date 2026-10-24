# F12: the patch file's header carries the fix text, at the cost of a hash an edit changes

- fork: keep the teach text in the header of `patches/pg-pool.patch` · freeze the header to a few stable lines (the
  failure cue and a pointer to the readme), and keep the prose in the readme alone
- found: pnpm records a hash of the whole patch file in each adopter's lockfile. any edit, a header word included,
  changes that hash; a `--frozen-lockfile` ci install then fails until the adopter re-locks
- taken: keep the teach text in the header. pnpm's failure warn names this file and no other, and the file lands in
  the adopter's repo; the readme lives in this repo's `dist/`, which an adopter rarely opens. the one text an adopter
  is sure to reach must hold the fix
- the cost, bounded: the `.recut` line now warns that any edit re-locks every adopter, so a maintainer edits the file
  only when the hunk must move, and the header rides along with that re-lock. `[case1] [t1]` clamps the warn
- the frozen-install failure stays unclamped: it is pnpm's own lockfile contract, not this practice's behavior, and
  the readme plus header name the re-lock step
- rework: clean — a header cut is one file edit, one re-lock, and the `[case1] [t1]` assertions moved to the readme
- confidence: 80%. a reviewer may weigh a quiet lockfile above an in-file teach
- where: `src/practices/persist-with-rds/best-practice/patches/pg-pool.patch`
- verdict: —
