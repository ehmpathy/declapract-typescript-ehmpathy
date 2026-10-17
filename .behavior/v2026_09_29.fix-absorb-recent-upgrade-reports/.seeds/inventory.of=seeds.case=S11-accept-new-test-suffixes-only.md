# S11 — accept the new test suffixes; rename none

## .said

> just accept the new names and dont replace anything yet; 2. #679 test-file rename: rename every adopter's test files to ._.{acpt,intg,unit,eval}.test.ts, or only accept the new names in jest and rename nothing.

> forwards compat here

## .settled

- #679 lands as forwards compat only: every jest config and every declaration keyed on a test file
  name accepts the `._.{acpt,intg,unit,eval}.test.ts` form beside the old suffixes.
- no file is renamed, and no old suffix is dropped. a repo may adopt the new names file by file.

## .landed

- F54 verdict, `1.vision.experience.case=_.md` row 679, `1.vision.yield.md`, `blocker/1.vision.md`
