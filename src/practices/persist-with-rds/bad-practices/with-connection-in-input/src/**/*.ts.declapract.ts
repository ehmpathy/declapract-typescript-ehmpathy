import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asInputToContextReviewMarker } from '../../../../../../utils/asInputToContextReviewMarker';
import { withReviewMarkerAbove } from '../../../../../../utils/withReviewMarkerAbove';

/**
 * .what = a line that imports, re-exports, or defines the retired `withDatabaseConnection`.
 * .why  = a multi-line import names the module only on its `from` line, so the module path is
 *         matched too; one marker per import statement either way.
 */
const WITH_DATABASE_CONNECTION_LINE_PATTERN =
  /(?:^\s*import\b[^\n]*\bwithDatabaseConnection\b|^\s*export\s+(?:const|function)\s+withDatabaseConnection\b|\bfrom\s+['"][^'"]*\/withDatabaseConnection['"])/;

const REVIEW_MARKER = asInputToContextReviewMarker({
  from: 'withDatabaseConnection (dbConnection in the input)',
  into: 'withDatabaseContext (src/utils/database/withDatabaseContext.ts)',
});

/**
 * .what = flags a src file that imports or defines `withDatabaseConnection`.
 * .why  = the practice replaced it with `withDatabaseContext`; the prior declaration was an EXISTS
 *         check with no fix, so an apply failed with no pointer to the replacement and each call
 *         site broke the build (#626). this check names each file by path in `plan`.
 */
export const check: FileCheckFunction = (contents) => {
  if (
    contents
      ?.split('\n')
      .some((line) => WITH_DATABASE_CONNECTION_LINE_PATTERN.test(line))
  )
    return; // bad practice detected
  throw new Error(
    'does not match bad practice: no import or definition of withDatabaseConnection',
  );
};

/**
 * .what = stamps the shared input→context review line above each such import or definition.
 * .why  = each op moves `dbConnection` from its input into a context arg, and each caller passes
 *         it as the 2nd arg — a shape change a regex cannot make safely — so the fix names the
 *         move beside the line, and never deletes the extant wrapper (its callers still need it).
 * .note = idempotent; the check stays red until a human moves the ops, so `plan` keeps it in view.
 * .note = an absent file is left absent: every fix must settle on absent input, a contract the
 *         repo-wide fix-coverage sweep holds (`practiceFixCoverage`, #607)
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return {
    contents: withReviewMarkerAbove({
      contents,
      lineMatcher: WITH_DATABASE_CONNECTION_LINE_PATTERN,
      marker: REVIEW_MARKER,
    }),
  };
};
