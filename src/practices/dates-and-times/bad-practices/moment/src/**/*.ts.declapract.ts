import type { FileCheckFunction } from 'declapract';

/**
 * .what = whether a source file imports `moment`, via esm import, side-effect import, or require
 */
const isMomentImported = (contents: string): boolean =>
  /(?:from\s+|import\s+|require\(\s*)['"]moment['"]/.test(contents);

/**
 * .what = detects a source file that imports `moment`
 * .why  = the detection lives on the importer, not on package.json. a moment migration has no
 *         safe automatic fix (a dropped dependency breaks every import), and declapract marks a
 *         file manual when one of its failed checks has no fix — so a package.json detection would
 *         block every other package.json fix in the repo. on the importer, the manual flag lands
 *         exactly on the file the adopter must migrate to iso-time.
 * .note = bad-practice semantics: return = detected, throw = not detected
 */
export const check: FileCheckFunction = (contents) => {
  if (contents !== null && isMomentImported(contents)) return;
  throw new Error('does not match bad practice: no moment import');
};
