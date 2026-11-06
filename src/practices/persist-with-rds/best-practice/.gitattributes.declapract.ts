import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

import {
  defineExpectedGitattributesContents,
  type GitattributesSection,
} from '../../../utils/defineExpectedGitattributesContents';

/**
 * .what = the `.gitattributes` section this practice owns: `.generated/` dirs fold in pr diffs
 * .why  = the daos and the schemas are the internal contracts, so a reviewer reads them open.
 *         a `.generated/` dir holds derived code (casts, query types, query functions) that
 *         every regen rewrites. github folds a file marked `linguist-generated`, one click away
 * .note = `codegen.sql.types.yml` and the dao generator write `src/access/daos/.generated/`.
 *         the `**` keeps a nested `.generated/` folded too, under the daos and the schemas
 *         alike; every other dao and schema file stays open
 */
const sections: readonly GitattributesSection[] = [
  {
    header: {
      latest: '# [persist-with-rds] collapse dao-generator output in pr diffs',
      retired: [],
    },
    entries: {
      latest: [
        'src/access/daos/**/.generated/** linguist-generated',
        'provision/schema/**/.generated/** linguist-generated',
      ],
      retired: [
        'src/access/daos/** linguist-generated',
        'provision/schema/sql/tables/** linguist-generated',
        'provision/schema/sql/views/** linguist-generated',
        'provision/schema/sql/functions/** linguist-generated',
      ],
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
    declarer: 'persist-with-rds',
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
