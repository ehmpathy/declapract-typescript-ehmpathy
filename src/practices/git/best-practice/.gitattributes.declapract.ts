import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

import {
  defineExpectedGitattributesContents,
  type GitattributesSection,
} from '../../../utils/defineExpectedGitattributesContents';

/**
 * .what = the `.gitattributes` sections this practice owns: lock-file diff and merge rules
 * .why  = lock files churn on every install. `-diff` folds them out of `git diff`, and
 *         `merge=theirs` takes the incoming lock on a conflict, so an install after the merge
 *         rebuilds it
 * .note = `retired` hold every form these sections once took — the untagged headers, the
 *         `pnpm-lock.json` typo — so a fix lifts them out of an extant file
 */
const sections: readonly GitattributesSection[] = [
  {
    header: {
      latest:
        '# [git] exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233',
      retired: [
        '# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233',
        '# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233',
      ],
    },
    entries: {
      latest: ['pnpm-lock.yaml -diff', 'package-lock.json -diff'],
      retired: ['pnpm-lock.json -diff'],
    },
  },
  {
    header: {
      latest:
        '# [git] auto-resolve lock file conflicts by taking theirs; run install after merge',
      retired: [
        '# auto-resolve lock file conflicts by taking theirs; run install after merge',
      ],
    },
    entries: {
      latest: ['pnpm-lock.yaml merge=theirs', 'package-lock.json merge=theirs'],
      retired: ['pnpm-lock.json merge=theirs'],
    },
  },
];

/**
 * .what = emits the `.gitattributes` this practice declares, given the repo's extant one
 * .why  = tests-any, rhachet, and the persist practices declare this same file. they converge
 *         only through one shared algorithm, so this file declares its sections and imports
 *         the rest
 */
const defineExpectedContents = (input: { contents: string | null }): string =>
  defineExpectedGitattributesContents({
    contents: input.contents,
    declarer: 'git',
    sections,
  });

/**
 * .what = throws when the repo's `.gitattributes` differs from what the shared layout emits
 * .why  = `check` gates `fix`: a throw means violated (best-practice semantics). an exact
 *         equality, not CONTAINS, since order carries load and `check(x) ⟺ x === fix(x)`
 *         keeps `declapract apply` from a loop
 */
export const check: FileCheckFunction = (contents) => {
  expect(contents).toEqual(defineExpectedContents({ contents }));
};

/**
 * .what = sets this practice's sections into the repo's `.gitattributes`
 * .why  = legacy headers and entries drop, duplicates collapse to one, repo-own lines move
 *         last; a fixed point, so a second fix changes zero
 */
export const fix: FileFixFunction = (contents) => ({
  contents: defineExpectedContents({ contents }),
});
