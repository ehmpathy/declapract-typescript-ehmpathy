import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * .what = the readme must contain the declared title line (default is equals)
 */
export const check = FileCheckType.CONTAINS;

/**
 * .what = writes the declared title where the readme is absent, and puts it atop a readme that
 *         lacks it; the adopter's own text is kept below it
 * .why  = declapract's own CONTAINS fix writes only an absent file, so a present readme without
 *         the title had no fix, and core marked the file manual (#607). a readme that already
 *         holds the title is returned unchanged, so a second fix is a no-op (#536)
 */
export const fix: FileFixFunction = (contents, context) => {
  const declared = context.declaredFileContents ?? '';
  if (!contents) return { contents: declared };
  // the same includes test the CONTAINS check makes, so the fix agrees with the check
  if (contents.includes(declared)) return { contents };
  return { contents: `${declared}\n${contents}` };
};
