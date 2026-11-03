# F13: a line in a declarer's own block that its template no longer lists is kept, as a repo-own line

## .the fork

a declarer's tagged block holds a line its `latest` no longer lists, and no `retired` entry names it. either a template entry was dropped with no prior, or a human added the line by hand.

- **A. keep it.** the fix moves it below the managed sections, as a repo-own line.
- **B. drop it.** the tag claims the block, so any unlisted line in it is retired.

## .taken: A

- the fix cannot tell a dropped template entry from a line a human typed. b would silently delete a human's line; a keeps it where the human can see and judge it (`rule.forbid.failhide`: never swallow)
- the retire path already exists and is explicit: move the entry to `retired`, and every fix removes it wherever it sits
- the howto now states the rule: "a fix never deletes a line it cannot prove it wrote ... to retire an entry, move it to `retired`; never just delete it"

## .rework: clean

one branch in `asBlocksRepoOwn`: drop unlisted lines of an own block, rather than lift them.

## .confidence: 80%, why not higher

a dropped entry kept as a repo-own line then outranks the managed exceptions; a maintainer who forgets the prior ships that. the howto rule and review are the guard, not a test.

## .risk: none

no credential, no prod write: which lines a generated file keeps.

## .where

raised by peer review r010 (a nitpick) and r011 (item 1) on 5.1 i004. code: `src/utils/defineExpectedGitattributesContents.ts` → `asBlocksRepoOwn`; doc: `howto.declare-the-repo-gitattributes.md`, "prior forms are lifted, never left".
