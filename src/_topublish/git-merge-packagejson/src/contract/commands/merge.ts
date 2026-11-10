import * as fs from 'fs';

import { mergePackageJson } from '../../domain.operations/mergePackageJson';

/**
 * exit codes per git merge driver conventions
 */
const EXIT_SUCCESS = 0;
const EXIT_CONFLICTS_LEFT = 1;
const EXIT_ERROR = 129;

/**
 * .what = git merge driver command for package.json
 * .why = auto-resolve dependency version conflicts via semver rules
 *
 * receives paths from git: %O (base), %A (ours/result), %B (theirs), %P (pathname)
 * writes merged result to %A
 *
 * exit codes:
 * - 0 = fully resolved
 * - 1 = conflicts left (non-dep fields)
 * - >128 = error
 */
export const merge = (input: {
  basePath: string;
  oursPath: string;
  theirsPath: string;
  pathname: string;
}): number => {
  const { basePath, oursPath, theirsPath } = input;

  try {
    // read all three files
    const baseContent = fs.readFileSync(basePath, 'utf-8');
    const oursContent = fs.readFileSync(oursPath, 'utf-8');
    const theirsContent = fs.readFileSync(theirsPath, 'utf-8');

    // merge
    const result = mergePackageJson({
      baseContent,
      oursContent,
      theirsContent,
    });

    // write merged result to ours path (the result file per git merge driver convention)
    fs.writeFileSync(oursPath, result.merged, 'utf-8');

    // exit based on whether conflicts remain
    if (result.hasConflictsLeft) {
      return EXIT_CONFLICTS_LEFT;
    }
    return EXIT_SUCCESS;
  } catch (error) {
    // log error to stderr
    if (error instanceof Error) {
      console.error(`git-merge-packagejson: ${error.message}`);
    } else {
      console.error('git-merge-packagejson: unknown error');
    }
    return EXIT_ERROR;
  }
};
