import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

import {
  defineExpectedGitattributesContents,
  type GitattributesSection,
} from '../../../utils/defineExpectedGitattributesContents';

/**
 * .what = the `.gitattributes` section this practice owns: dao-generator output folds in pr diffs
 * .why  = one domain-object change regenerates the dao tree; the domain object is the change a
 *         human judges. github folds a file marked `linguist-generated`, one click away
 * .note = only `src/access/daos` (`codegen.dynamodb.dao.ts` → `directories.dao`). the
 *         generator's terraform dir, `provision/aws/product`, also holds hand-written infra, and
 *         an infra change owes open eyes, so it stays open
 */
const sections: readonly GitattributesSection[] = [
  {
    header: {
      latest:
        '# [persist-with-dynamodb] collapse dao-generator output in pr diffs',
      retired: [],
    },
    entries: {
      latest: ['src/access/daos/** linguist-generated'],
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
    declarer: 'persist-with-dynamodb',
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
