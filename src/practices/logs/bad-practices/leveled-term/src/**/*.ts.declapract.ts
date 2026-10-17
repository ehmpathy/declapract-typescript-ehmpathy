import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { withReviewMarkerAbove } from '../../../../../../utils/withReviewMarkerAbove';

/**
 * .what = an import (or require) of the retired `simple-leveled-log-methods`.
 */
const LEVELED_IMPORT_PATTERN =
  /(?:\bfrom\s+|\brequire\(\s*|\bimport\(\s*)['"]simple-leveled-log-methods(?:\/[^'"]*)?['"]/;

const REVIEW_MARKER =
  "// @declapract:review: simple-leveled-log-methods is retired — import the logs practice's `log` (src/utils/logger.ts, built by sdk-logs `genLogMethods`) in its place, then delete this marker";

/**
 * .what = flags a src file that still imports `simple-leveled-log-methods`.
 * .why  = the package.json half of this practice removes the dep; a file that still imports it
 *         then fails tsc with no pointer to the move (#643). this check makes `plan` name each such
 *         file by path, beside the dep removal.
 */
export const check: FileCheckFunction = (contents) => {
  if (contents && LEVELED_IMPORT_PATTERN.test(contents)) return; // bad practice detected
  throw new Error(
    'does not match bad practice: no import of simple-leveled-log-methods',
  );
};

/**
 * .what = stamps a review line above each such import that names the replacement.
 * .why  = the move to sdk-logs changes how a log is built and passed, which a regex cannot know,
 *         so the fix names the move beside the line tsc will fail on, and rewrites no code.
 * .note = idempotent: an import already marked is left alone. the check stays red until a human
 *         moves the import, so `plan` keeps the file in view.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return {
    contents: withReviewMarkerAbove({
      contents,
      lineMatcher: LEVELED_IMPORT_PATTERN,
      marker: REVIEW_MARKER,
    }),
  };
};
