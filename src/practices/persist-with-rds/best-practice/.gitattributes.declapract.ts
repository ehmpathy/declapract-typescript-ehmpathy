import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

import {
  defineExpectedGitattributesContents,
  type GitattributesSection,
} from '../../../utils/defineExpectedGitattributesContents';

/**
 * .what = the `.gitattributes` section this practice owns: dao-generator output folds in pr diffs
 * .why  = one domain-object change regenerates the dao tree and its sql. the domain object is
 *         the change a human judges; the regen derives from it. github folds a file marked
 *         `linguist-generated`, one click away, so a pr opens on the domain change
 * .note = paths match `codegen.sql.dao.yml` (`src/access/daos`), `codegen.sql.schema.yml`
 *         (`provision/schema/sql`), and `codegen.sql.types.yml` (its tables/views/functions
 *         globs). `provision/schema/sql/init/` is hand-declared, so it stays open
 * .note = a repo with hand-written queries under `src/access/daos/` un-folds them with a
 *         repo-own `<path> -linguist-generated` line; the shared layout keeps it last, so it wins
 */
const sections: readonly GitattributesSection[] = [
  {
    header: {
      latest: '# [persist-with-rds] collapse dao-generator output in pr diffs',
      retired: [],
    },
    entries: {
      latest: [
        'src/access/daos/** linguist-generated',
        'provision/schema/sql/tables/** linguist-generated',
        'provision/schema/sql/views/** linguist-generated',
        'provision/schema/sql/functions/** linguist-generated',
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
