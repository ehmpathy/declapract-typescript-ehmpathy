# F13 — the upgrade journey's steps share one repo, in order

## .the fork

l3 peer review noted lock `[case4]` runs `[t0]` to `[t2]` on one temp repo, so a filtered run of
`[t1]` or `[t2]` alone fails. two paths:

- give each step its own repo, each rebuilt from an apply
- keep one repo, since each step of the journey builds on the last

## .taken

one repo. the journey is the point: the upgrade lands once, then the same repo meets old text, then
the mask. three applies would test three upgrades, not one upgrader's path. the lock suite's
`[case2]` has the same in-order shape.

## .rework

clean: one `genTempDir` and apply per `when`.

## .confidence

85%.

## .where

`src/practices/husky/check.timestamps.lock.play.declapract.integration.test.ts` `[case4]`; peer lane
`enroll-verif-snapshot-coverage`, 5.3 round i006, nitpick 1.

## .verdict

open.
