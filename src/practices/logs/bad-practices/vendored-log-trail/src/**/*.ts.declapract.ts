import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asInputToContextReviewMarker } from '../../../../../../utils/asInputToContextReviewMarker';
import { withReviewMarkerAbove } from '../../../../../../utils/withReviewMarkerAbove';

/**
 * .what = the fingerprints of a vendored copy of visualogic's `withLogTrail`.
 * .why  = the fork carries visualogic's jsdoc byte-for-byte, todos and all, and the option name
 *         visualogic retired; either one marks a local copy rather than a use of the library.
 */
const FORK_FINGERPRINTS = [
  /hookup visual tracing w\/ external lib/,
  /\bdurationReportingThresholdInSeconds\b/,
];

/**
 * .what = the first exported declaration of a file.
 */
const FIRST_EXPORT_PATTERN = /^export\s+(?:const|function)\s+\w+/m;

/**
 * .what = whether a file defines (rather than imports) a withLogTrail-shaped wrapper.
 */
const isVendoredLogTrail = (input: { contents: string }): boolean =>
  FIRST_EXPORT_PATTERN.test(input.contents) &&
  FORK_FINGERPRINTS.some((fingerprint) => fingerprint.test(input.contents));

/**
 * .what = a matcher for the line that opens with a given export declaration, read literally
 */
const asLineMatcherForExport = (input: { declaration: string }): RegExp =>
  new RegExp(`^${input.declaration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);

const REVIEW_MARKER = asInputToContextReviewMarker({
  from: 'this vendored copy of withLogTrail (it logs no error on a throw)',
  into: "visualogic's withLogTrail",
});

/**
 * .what = flags a src file that holds a vendored fork of visualogic's `withLogTrail`.
 * .why  = the fork drifted: it has no error branch, so each op it wraps is silent when it fails,
 *         and it takes a variadic arg list where withLogTrail takes `(input, context)` (#635).
 */
export const check: FileCheckFunction = (contents) => {
  if (contents && isVendoredLogTrail({ contents })) return; // bad practice detected
  throw new Error(
    'does not match bad practice: no vendored withLogTrail fork in this file',
  );
};

/**
 * .what = stamps the shared input→context review line above the fork's first export.
 * .why  = each op the fork wraps, and each caller, changes shape — the same move #626 names for
 *         withDatabaseConnection, often at the same call sites — so the fix names the move once
 *         and rewrites no code.
 * .note = idempotent; the check stays red until a human moves the ops, so `plan` keeps it in view.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const firstExport = contents.match(FIRST_EXPORT_PATTERN)?.[0];
  if (!firstExport) return { contents };
  return {
    contents: withReviewMarkerAbove({
      contents,
      lineMatcher: asLineMatcherForExport({ declaration: firstExport }),
      marker: REVIEW_MARKER,
    }),
  };
};
