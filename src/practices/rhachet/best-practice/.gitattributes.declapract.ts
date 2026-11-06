import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

import {
  defineExpectedGitattributesContents,
  type GitattributesSection,
} from '../../../utils/defineExpectedGitattributesContents';

/**
 * .what = the `.gitattributes` section this practice owns: route robocode folds in pr diffs
 * .why  = rhachet installs the roles that drive routes (bhrain: `.route/`; bhuild:
 *         `.behavior/`). a route carries stones, guards, reviews, caches: the trail. the
 *         yields hold what the route concluded, and `.radio/` holds what it handed off. so a
 *         pr folds the trail and opens on the yields and the radio
 * .note = order carries load: git takes the last line that matches, so each
 *         `-linguist-generated` exception follows the collapse line it carves out of.
 *         attributes never recurse from a dir, so each pattern ends in `/**`
 */
const sections: readonly GitattributesSection[] = [
  {
    header: {
      latest:
        '# [rhachet] collapse route robocode in pr diffs; yields and radio stay open',
      retired: [],
    },
    entries: {
      latest: [
        '.route/** linguist-generated',
        '.route/**/*.yield.* -linguist-generated',
        '.route/**/.radio/** -linguist-generated',
        '.behavior/** linguist-generated',
        '.behavior/**/*.yield.* -linguist-generated',
        '.behavior/**/.radio/** -linguist-generated',
      ],
      retired: [],
    },
  },
];

/**
 * .what = emits the `.gitattributes` this practice declares, given the repo's extant one
 * .why  = several practices declare this file; they converge only through the shared util
 */
const defineExpectedContents = (input: { contents: string | null }): string =>
  defineExpectedGitattributesContents({
    contents: input.contents,
    declarer: 'rhachet',
    sections,
  });

/**
 * .what = throws when the repo's `.gitattributes` differs from what the shared layout emits
 * .why  = `check` gates `fix` (a throw means violated); exact equality, so `check(x) ⟺ x === fix(x)`
 */
export const check: FileCheckFunction = (contents) => {
  expect(contents).toEqual(defineExpectedContents({ contents }));
};

/**
 * .what = sets this practice's section into the repo's `.gitattributes`
 * .why  = a fixed point: a second fix changes zero, and `check` passes on the output
 */
export const fix: FileFixFunction = (contents) => ({
  contents: defineExpectedContents({ contents }),
});
