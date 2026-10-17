import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';

const PRACTICE = 'declastruct/old-module-name';

/**
 * .what = the retired name of this practice package
 */
const OLD_MODULE_NAME = 'best-practices-typescript';

/**
 * .what = whether a package.json declares the retired module name, in either dependency map
 * .note = parses the contents. a match against `JSON.stringify(contents)` (a string) never
 *         matched an object shape, so the detection was dead.
 */
const isOldModuleDeclared = (contents: string | null): boolean => {
  if (contents === null) return false;
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  return [packageJSON.dependencies, packageJSON.devDependencies].some(
    (deps) => !!deps && OLD_MODULE_NAME in deps,
  );
};

/**
 * .what = one dependency section, with the retired module name dropped
 */
const asSectionWithoutOldModule = (input: {
  section: Record<string, string> | undefined;
}): Record<string, string> | undefined =>
  input.section
    ? Object.fromEntries(
        Object.entries(input.section).filter(
          ([name]) => name !== OLD_MODULE_NAME,
        ),
      )
    : input.section;

/**
 * .what = detects a package.json that still depends on the retired `best-practices-typescript`
 * .note = bad-practice semantics: return = detected, throw = not detected
 */
export const check: FileCheckFunction = (contents) => {
  if (isOldModuleDeclared(contents)) return;
  throw new Error(
    'does not match bad practice: no best-practices-typescript dependency',
  );
};

/**
 * .what = drops the retired dependency from both dependency maps
 * .why  = a detection with no fix marks the whole package.json manual, which blocks every other
 *         package.json fix. the declapract practice declares the current package itself, so a
 *         drop is all this repair owes.
 */
export const fix: FileFixFunction = (contents) => {
  if (contents === null) return { contents };
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  return {
    contents: JSON.stringify(
      {
        ...packageJSON,
        dependencies: asSectionWithoutOldModule({
          section: packageJSON.dependencies,
        }),
        devDependencies: asSectionWithoutOldModule({
          section: packageJSON.devDependencies,
        }),
      },
      null,
      2,
    ),
  };
};
