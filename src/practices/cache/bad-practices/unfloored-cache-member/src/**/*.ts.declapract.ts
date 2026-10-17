import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { withReviewMarkerAbove } from '../../../../../../utils/withReviewMarkerAbove';

/**
 * .what = an import (or require) of the retired `with-simple-caching`.
 */
const RETIRED_CACHE_IMPORT_PATTERN =
  /(?:\bfrom\s+|\brequire\(\s*|\bimport\(\s*)['"]with-simple-caching(?:\/[^'"]*)?['"]/;

const REVIEW_MARKER =
  '// @declapract:review: with-simple-caching is retired — import from with-simple-cache (>=0.17.3) in its place: its cache `get()` is async, and its on-disk `directory` option replaces `s3` / `directoryToPersistTo`. then delete this marker';

/**
 * .what = flags a src file that still imports `with-simple-caching`.
 * .why  = the package.json half of this bad-practice moves the dep to with-simple-cache only once
 *         no src file imports it (#625); this half names each import that holds the move back.
 */
export const check: FileCheckFunction = (contents) => {
  if (contents && RETIRED_CACHE_IMPORT_PATTERN.test(contents)) return; // bad practice detected
  throw new Error(
    'does not match bad practice: no import of with-simple-caching',
  );
};

/**
 * .what = stamps a review line above each such import that names the replacement.
 * .note = idempotent; the check stays red until a human moves the import.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return {
    contents: withReviewMarkerAbove({
      contents,
      lineMatcher: RETIRED_CACHE_IMPORT_PATTERN,
      marker: REVIEW_MARKER,
    }),
  };
};
