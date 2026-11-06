# howto: declare the repo-root `.gitattributes`

five practices declare this one file: `git`, `tests-any`, `rhachet`, `persist-with-rds`, and
`persist-with-dynamodb`. this is what they share. read it before you add a line to one of them, or
add a new declarer.

## each practice declares what it causes

a practice declares the attributes for the files it causes to exist. `rhachet` installs the roles
that write `.route/` and `.behavior/`, so it folds them. `tests-any` sets up the test runner, so it
folds `*.test.ts`. each persist practice ships the dao generator, so it folds that output.

## order carries load, so the layout is canonical

git takes the LAST line that matches a path. a sorted union (the `.gitignore` method) would move
an exception line above the collapse line it carves out of, and the exception would go inert.

so `src/utils/defineExpectedGitattributesContents.ts` emits one canonical layout:

- managed sections first, grouped by declarer in `declarersOrderedForGitattributes` order
- each declarer's sections in the order that declarer declares them
- the repo's own lines last, in their own order

`rhachet` sits last among the declarers: its exceptions must be the last managed match for a route
path, or a later collapse line (`*.test.ts`) would fold a yield or radio file named like a test. a
new declarer adds itself to that list at the place its lines must hold; the util throws on a
declarer the list does not name, and `[case3]` of `src/practiceOwnerPerFile.declapract.integration.test.ts`
fails until the list and the declarers match.

repo-own lines go last on purpose: a `<path> -linguist-generated` line a repo adds then outranks
every managed collapse line, so a repo un-folds a path with no edit to any practice.

## the declarer tag is how declarers agree

each managed header opens with `# [<declarer>] `. a declarer knows only its own sections. it
recognizes another declarer's block by the tag and keeps it verbatim, in canonical place, byte for
byte: it drops no line from it, not even one it also declares. so the fixes commute, and each is a
fixed point. two sections may carry one entry (`src/access/daos/**/.generated/**`, rds and dynamodb); both are
collapse lines above every exception, so the repeat is inert. the util throws on a section header
that lacks the tag.

a new declarer imports the util rather than re-derive the layout: a hand-rolled copy can pass its
own check and still oscillate against the rest.

a repo-own line glued under a tagged header, with no blank line, reads as part of that block.
another declarer keeps the block whole; only the block's owner lifts the line out to the repo-own
lines. so a full apply heals it, and a repo whose owner practice was dropped keeps it in place.

## retired forms are lifted, never left

`retired` on a section names every header and entry it once held (the untagged template, the
`pnpm-lock.json` typo); the `.gitignore` declarers call the same list `ignoresRetired`. a fix
removes them wherever they sit, so an upgrade leaves no stale copy.

a fix never deletes a line it cannot prove it wrote. an entry dropped from `latest` and not listed
in `retired` reads as a line the repo added: the fix keeps it, as a repo-own line at the bottom, where it then
outranks every managed line. so to retire an entry, move it to `retired`; never just delete it.

## a new declarer owes cross-declarer tests

idempotency does not imply convergence. add the declarer's `fix` to the convergence clamp in
`src/gitattributesDeclarers.declapract.test.ts` (every order, every pair), and to `[case1]` in
`src/gitattributesDeclarers.declapract.integration.test.ts`, which asks git itself
(`git check-attr`) whether each path folds. both sit at the `src/` root: they span practices, so
no one practice owns them, and no practice imports another.

## the check is an exact equality, on purpose

`check` asserts `contents` equals what `fix` would emit. the expected value keeps the file's own
lines, so custom attributes survive. what it mandates is order, which a `contains` check cannot
see. it also makes `check(x) ⟺ x === fix(x)`, so `declapract apply` cannot loop.

## this repo consumes three of them

`useCase: npm-package` carries `git`, `tests-any`, and `rhachet`. `[case2]` in
`src/gitattributesDeclarers.declapract.integration.test.ts` checks this repo's own file against all
three. when a practice's output changes, run
`rhx declapract.self.apply --practice <name> --file .gitattributes` for each, never a hand edit.
