# F11 — the upgrade journey runs the lock then the scan, not a real `git commit`

## .the fork

l3 peer review noted no test runs a real `git commit` through husky's pre-commit. two paths:

- install husky in a temp repo and run `git commit`
- run the two hooks pre-commit runs, in its order, and leave husky's own setup to its suites

## .taken

the second. lock suite `[case4]` applies the hook and the restamped lock through declapract, then
runs the lock and the scan in pre-commit order on each staged state. the lock suite's `[case2]`
already proves pre-commit, a posix `sh` file, sources the lock. a real commit would add husky's
install and the other pre-commit checks, which this pr does not touch, and makes the suite depend on
them.

## .rework

clean: one more `when` in the lock suite, if husky's setup ever earns its own proof here.

## .confidence

85%.

## .where

`src/practices/husky/check.timestamps.lock.play.declapract.integration.test.ts` `[case4]`; peer lane
`enroll-verif-snapshot-coverage`, 5.3 round i004, nitpick 4.

## .verdict

open.
