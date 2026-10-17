import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { ConstraintError, MalfunctionError } from 'helpful-errors';

export const MARKER_BEGIN =
  '// >>> declapract: metro cache keyed on ACCESS + app config';
export const MARKER_END =
  '// <<< declapract: metro cache keyed on ACCESS + app config';

/**
 * .what = the declared contents this check and fix read, or a loud failure where none arrived
 * .why  = this declaration ships a template beside it, so an absent body is a pipeline
 *         malfunction, never a consumer input
 */
const asDeclaredContents = (input: {
  declaredFileContents: string | null;
}): string =>
  input.declaredFileContents ??
  MalfunctionError.throw('metro.config.js declared contents were not emitted');

/**
 * .what = the marker-delimited span of a file, from the begin marker through the end marker
 * .why  = the block is the only part of metro.config.js this practice owns; every other line
 *         is the repo's (e.g. a resolver blockList, hoist tweaks)
 */
const asMarkedSpan = (input: {
  contents: string;
}): { begin: number; end: number } | null => {
  const begin = input.contents.indexOf(MARKER_BEGIN);
  const endAt = input.contents.indexOf(MARKER_END);
  if (begin === -1 && endAt === -1) return null;
  if (begin === -1 || endAt === -1 || endAt < begin)
    throw new ConstraintError(
      'metro.config.js holds one access-cache marker without its pair',
      {
        hint: `restore both markers, or delete the partial block so the next apply re-adds it whole: ${MARKER_BEGIN} … ${MARKER_END}`,
      },
    );
  return { begin, end: endAt + MARKER_END.length };
};

/**
 * .what = the metro.config.js contents this practice expects, given the repo's found contents
 * .why  = a findsert of one block: the full template where the file is absent; the declared
 *         block swapped in place where the markers stand; else the block appended after the
 *         repo's own lines, so it reads the final `module.exports`
 */
export const asExpectedMetroConfig = (input: {
  found: string | null;
  declared: string;
}): string => {
  // absent file: the full template
  if (input.found === null) return input.declared;

  // the declared block, read from the template's own markers
  const spanDeclared =
    asMarkedSpan({ contents: input.declared }) ??
    MalfunctionError.throw('the metro.config.js template lost its markers');
  const block = input.declared.slice(spanDeclared.begin, spanDeclared.end);

  // markers present: replace the span in place
  const spanFound = asMarkedSpan({ contents: input.found });
  if (spanFound)
    return (
      input.found.slice(0, spanFound.begin) +
      block +
      input.found.slice(spanFound.end)
    );

  // markers absent: append the block after the repo's own lines
  const foundTrimmed = input.found.replace(/\s+$/, '');
  return `${foundTrimmed}\n\n${block}\n`;
};

/**
 * .what = pass when metro.config.js holds the declared access-keyed cache block, with the
 *         repo's own lines as found
 * .why  = `expo export` reused one metro cache across every access, so a prep transform could
 *         ship inside a prod bundle (#618, #676). never EQUALS: adopters hand-edit this file.
 */
export const check: FileCheckFunction = (contents, context) => {
  if (contents === null) throw new Error('metro.config.js is absent');
  const expected = asExpectedMetroConfig({
    found: contents,
    declared: asDeclaredContents(context),
  });
  if (expected !== contents)
    throw new Error(
      'metro.config.js lacks the declared access-keyed cache block, or it drifted',
    );
};

/**
 * .what = findsert the access-keyed cache block; the repo's own lines stay
 * .why  = see `check`. the output is a fixed point, so a second apply changes zero bytes.
 */
export const fix: FileFixFunction = (contents, context) => ({
  contents: asExpectedMetroConfig({
    found: contents,
    declared: asDeclaredContents(context),
  }),
});
