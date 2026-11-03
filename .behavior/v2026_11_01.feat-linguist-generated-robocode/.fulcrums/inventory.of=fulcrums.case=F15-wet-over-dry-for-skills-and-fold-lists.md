# F15: the two new skills and the fold lists stay wet; the fixture move stays in scope

## .the fork

peer review r011 raised three points of shape and scope:

- the two new bash skills each carry their own `fail_constraint`, `fail_malfunction`, and `require_value`
- each fold list is written in the declarer's sections, in the git readme table, and in the owner's readme, with no test that ties them
- the cicd-common declarations fixture moved, which the wish did not ask for

## .taken: keep the skills wet, keep the lists in prose, keep the move

- **skills.** two usages. `rule.prefer.wet-over-dry` waits for a third before it extracts; a shared sourced file would also make each skill depend on its neighbor's path
- **fold lists.** the sections are the source; the readmes summarize them for a human (`.route/**` with its exceptions in one row, brace globs). a test that ties prose to globs would match on text the prose is free to phrase. each owner readme points to the git table, so a drift shows in one place
- **fixture move.** the git fixture had to leave the repo-root `.test/` (`rule.forbid.test-assets-in-src`); the cicd-common fixture shared that dir, and it moved with it so the dir could be removed whole, not left with one stray occupant

## .rework: clean

a sourced `skills/.lib/errors.sh`; a readme-vs-section text test; or revert the cicd-common move and leave a root `.test/` with one fixture.

## .confidence: 80%, why not higher

the error functions are a third copy away from a lib, and a drift test on the readme table would catch a stale row.

## .risk: none

no credential, no prod write: code shape and test fixture location.

## .where

raised by peer review r011 (items 6 and 9) on 5.1 i004. files: `.agent/repo=.this/role=any/skills/{git.attr.get,declapract.self.apply}.sh`, the practice readmes, `src/.test/assets/cicd-common/`.
