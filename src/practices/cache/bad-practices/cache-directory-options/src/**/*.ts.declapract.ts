import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { withReviewMarkerAbove } from '../../../../../../utils/withReviewMarkerAbove';

/**
 * .what = a cache directory option that with-simple-cache 0.17.3 no longer accepts.
 * .why  = `directoryToPersistTo` and `s3` left the options at 0.17.3; `directory` replaces both.
 */
const RETIRED_DIRECTORY_OPTION_PATTERN =
  /^(?!\s*\/\/).*(?:\bdirectoryToPersistTo\b|\bs3\s*:(?!\/\/))/;

/**
 * .what = an `s3:` object key, the retired option.
 * .why  = `(?!\/\/)` passes the `s3://` scheme of a uri, which the `directory.cloud.path` of
 *         0.17.3 carries (e.g. the config practice's own getOneCacheDirectory template).
 */
const S3_KEY_PATTERN = /\bs3\s*:(?!\/\/)/;

/**
 * .what = a file's code lines, with each `//` comment line dropped.
 * .why  = the review marker names both retired options, so the check must read code, not prose.
 */
const asCodeLines = (input: { contents: string }): string =>
  input.contents
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');

/**
 * .what = the hint that a file builds a cache directory, so an `s3:` key is the cache option.
 */
const CACHE_DIRECTORY_HINT_PATTERN =
  /\bgetCacheDirectory\b|['"](?:with-simple-cache|simple-on-disk-cache)['"]/;

const REVIEW_MARKER =
  '// @declapract:review: with-simple-cache 0.17.3 retired `s3` and `directoryToPersistTo` — pass `directory` in their place, and `await` each cache `get()`, which now returns a Promise. then delete this marker';

/**
 * .what = whether a file declares a cache directory option retired at with-simple-cache 0.17.3.
 */
const isRetiredDirectoryOptionDeclared = (input: {
  contents: string;
}): boolean => {
  const code = asCodeLines({ contents: input.contents });
  return (
    /\bdirectoryToPersistTo\b/.test(code) ||
    (CACHE_DIRECTORY_HINT_PATTERN.test(code) && S3_KEY_PATTERN.test(code))
  );
};

/**
 * .what = flags a src file that still passes `s3` / `directoryToPersistTo` to the cache.
 * .why  = the `cache` floor raises with-simple-cache to 0.17.3, which drops both options, so the
 *         file fails to type-check with no pointer to the move (#644).
 */
export const check: FileCheckFunction = (contents) => {
  if (contents && isRetiredDirectoryOptionDeclared({ contents })) return; // bad practice detected
  throw new Error(
    'does not match bad practice: no retired cache directory option',
  );
};

/**
 * .what = stamps a review line above each retired option that names the `directory` move.
 * .why  = the replacement shape depends on where the repo persists its cache, which a regex
 *         cannot know, so the fix names the move and rewrites no code.
 * .note = idempotent; the check stays red until a human moves the option.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return {
    contents: withReviewMarkerAbove({
      contents,
      lineMatcher: RETIRED_DIRECTORY_OPTION_PATTERN,
      marker: REVIEW_MARKER,
    }),
  };
};
