# F18 — the git merge header keeps its shipped words; only the tag is added

## .the fork

the git practice's prior merge header is `HEADER_MERGE_PRIOR` in `src/practices/git/.gitattributes.declapract.test.ts`. the tag convention (F7) rewrites every managed header once. two paths:

- **keep the words, add only the tag**: `# [git] ` + the shipped header text
- **reword while the header changes anyway**: new words that this repo's write hooks do not flag

## .taken, why

keep the words. the vision promises the lock-file sections unchanged apart from the tag, so a reword is a change no stone sanctioned. the write hooks flag the old words but pass a retry, and the old text already sits in this repo (`retired`, test fixtures), so they set no hard limit. the untagged header stays in `retired`, so a fix lifts it.

## .rework

clean. swap the `latest` header text in `src/practices/git/best-practice/.gitattributes.declapract.ts`, and resnap the git and declarer snapshots.

## .confidence

90%. the vision states the header words; the tag is the one sanctioned change (F7).

## .where

- `src/practices/git/best-practice/.gitattributes.declapract.ts` (header `latest` and `retired`)
- `src/practices/git/.gitattributes.declapract.test.ts` (`EXPECTED_FULL_CONTENT`, `HEADER_MERGE_PRIOR`)

## .verdict

ruled by peer review 5.3 i005 r012 (blocker.3): the vision gave the reword no support, and the hook reason did not hold. the reword was reverted; the words ship as before, tagged.
