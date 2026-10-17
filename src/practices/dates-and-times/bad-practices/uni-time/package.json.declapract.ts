// eslint-disable-next-line import/no-extraneous-dependencies
import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

/**
 * .what = the iso-time version the uni-time fix installs; the release the src fix's identifier
 *         map was read against (iso-time's own uni-time migration table).
 */
const ISO_TIME_VERSION = '1.11.7';

/**
 * .what = one dependency section, with `@ehmpathy/uni-time` swapped for `iso-time` where it sat.
 * .note = an extant `iso-time` version is kept; a section with no uni-time is returned as is.
 */
const asSectionWithUniTimeSwapped = (input: {
  section: Record<string, string> | undefined;
}): Record<string, string | undefined> | undefined => {
  if (!input.section?.['@ehmpathy/uni-time']) return input.section;
  return {
    ...input.section,
    '@ehmpathy/uni-time': undefined, // undefined drops the key from the written json
    'iso-time': input.section['iso-time'] ?? ISO_TIME_VERSION,
  };
};

/**
 * .what = swap `@ehmpathy/uni-time` for `iso-time` in each dep section that held it.
 * .why  = the src fix rewrites every `@ehmpathy/uni-time` import to `iso-time`; a package.json fix
 *         that only removes the old dep leaves each rewritten file on a package that is not
 *         installed, and tsc fails with `Cannot find module 'iso-time'` (#642). so `iso-time` lands
 *         in the same section `@ehmpathy/uni-time` sat in.
 * .note = an extant `iso-time` version is the adopter's choice and is kept. a section the repo
 *         never declared is not added.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // pass through if contents absent
  const packageJSON = JSON.parse(contents);

  // swap the dep within each section, only where uni-time sat
  const updatedPackageJSON = {
    ...packageJSON,
    dependencies: asSectionWithUniTimeSwapped({
      section: packageJSON.dependencies,
    }),
    devDependencies: asSectionWithUniTimeSwapped({
      section: packageJSON.devDependencies,
    }),
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
