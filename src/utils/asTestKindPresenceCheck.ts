import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { FileCheckFunction } from 'declapract';

import { getAllPathsUnderDir } from './getAllPathsUnderDir';

/**
 * .what = a best-practice check that passes when the repo holds at least one test file of a kind,
 *         in EITHER suffix form: the declared glob's old form (`x.integration.test.ts`) or the
 *         `._.` kind seam (`x._.intg.test.ts`).
 * .why  = the jest configs match both suffix forms (forwards compat, #679), so a repo that names
 *         its files with the `._.` seam must not read as one with no tests of that kind. a bare
 *         `FileCheckType.EXISTS` on the old glob would flag it.
 * .how  = declapract hands the check each file the declared glob found; any found file means the
 *         kind is present. with zero matches it hands one `null`, so the check then walks `dir`
 *         for a file that ends with the seam suffix.
 * .note = the walk skips `node_modules` and `.agent` (rhachet host-local state may hold a scratch
 *         clone of the repo, whose files are not the repo's own).
 */
export const asTestKindPresenceCheck =
  (input: {
    dir: string;
    suffixOld: string;
    suffixSeam: string;
  }): FileCheckFunction =>
  (contents, context) => {
    // a file of the old suffix form matched the declared glob
    if (contents !== null) return;

    // else, look for a file of the `._.` seam form under the dir
    const root = join(context.getProjectRootDirectory(), input.dir);
    const seamFound =
      existsSync(root) &&
      getAllPathsUnderDir({ dir: root, skip: ['node_modules', '.agent'] }).some(
        (path) => path.endsWith(input.suffixSeam),
      );
    if (seamFound) return;

    throw new Error(
      `expected at least one test file under ${input.dir}/ named *${input.suffixOld} or *${input.suffixSeam}`,
    );
  };
