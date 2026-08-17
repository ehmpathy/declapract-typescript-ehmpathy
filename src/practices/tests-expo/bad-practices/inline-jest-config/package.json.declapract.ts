import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = removes a top-level `jest` key from a consumer's package.json.
 * .why  = an expo app that migrated by hand often carries a jest-expo preset INLINE in
 *         package.json AND a jest.*.config.ts file at the same time — a dual source of
 *         truth. tests-expo declares the jest config as its own jest.*.config.ts files
 *         (the go-forward home), so the inline block is redundant and must be dropped, or
 *         two configs fight over the same run. this is a bad-practice: `check` DETECTS the
 *         inline key (returns) and `fix` drops it, so the jest.*.config.ts files stay the
 *         one home.
 */
export const check: FileCheckFunction = (contents) => {
  // no package.json → no key to detect, skip
  if (!contents) throw new Error('does not match bad practice');

  // an inline `jest` key is the dual-source hazard → detected
  const packageJSON = JSON.parse(contents);
  if (packageJSON.jest !== undefined) return;

  // no inline `jest` key → not the bad practice, skip
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  // drop the inline `jest` key; the jest.*.config.ts files are the one home.
  // destructure to EXCLUDE the key rather than delete-in-place (rule.require.immutable-vars)
  const packageJSON = JSON.parse(contents);
  const { jest: _jest, ...updatedPackageJSON } = packageJSON;

  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
