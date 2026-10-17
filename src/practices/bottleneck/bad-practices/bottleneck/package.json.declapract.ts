import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { isPackageImportedInRepo } from '../../../../utils/isPackageImportedInRepo';

/**
 * .what = the `with-bottleneck` version this fix pins.
 * .why  = with-bottleneck publishes `0.0.0`–`0.1.2`; the bottleneck version (`2.x`) copied onto it
 *         is uninstallable (`ERR_PNPM_NO_MATCHING_VERSION with-bottleneck@2.19.5`, #663).
 */
const WITH_BOTTLENECK_VERSION = '0.1.2';

/**
 * .what = whether a declared with-bottleneck version is a copy of bottleneck's own (`>=1.x`).
 * .why  = the prior fix wrote bottleneck's version onto with-bottleneck; any `1.x`+ pin is that
 *         copy and never installs, so the fix must repair it too.
 */
const isWithBottleneckVersionCopied = (input: {
  version: string | undefined;
}): boolean => {
  const major = input.version?.match(/(\d+)\./)?.[1];
  return major !== undefined && Number(major) >= 1;
};

/**
 * .what = whether any code dir of the repo still imports bottleneck directly.
 * .why  = a fix that drops bottleneck while a live import remains leaves a tree that does not
 *         build; such a repo keeps bottleneck beside with-bottleneck until a human moves it (F42).
 *         the scan spans the whole repo (src, provision, blackbox, …), so no code dir hides one.
 */
const isBottleneckImported = (input: {
  getProjectRootDirectory: () => string;
}): boolean =>
  isPackageImportedInRepo({
    projectRoot: input.getProjectRootDirectory(),
    packageName: 'bottleneck',
    dirs: ['.'],
  });

/**
 * .what = the `dependencies` map of a package.json, or an empty map where none is declared.
 */
const asDependencies = (input: {
  contents: string | null;
}): Record<string, string> =>
  JSON.parse(input.contents ?? '{}').dependencies ?? {};

/**
 * .what = the with-bottleneck version to write: a valid extant pin, else the published one.
 */
const asWithBottleneckVersionPinned = (input: {
  version: string | undefined;
}): string =>
  input.version && !isWithBottleneckVersionCopied({ version: input.version })
    ? input.version
    : WITH_BOTTLENECK_VERSION;

/**
 * .what = flags a package.json that holds bottleneck where with-bottleneck should, or a
 *         with-bottleneck pin copied from bottleneck's version.
 */
export const check: FileCheckFunction = (contents, context) => {
  const dependencies = asDependencies({ contents });

  // a with-bottleneck pin copied from bottleneck never installs
  if (
    isWithBottleneckVersionCopied({
      version: dependencies['with-bottleneck'],
    })
  )
    return; // bad practice detected

  // bottleneck with no with-bottleneck beside it
  if (dependencies.bottleneck && !dependencies['with-bottleneck']) return; // bad practice detected

  // bottleneck beside with-bottleneck, but no src import still needs it
  if (dependencies.bottleneck && !isBottleneckImported(context)) return; // bad practice detected

  throw new Error('does not match bad practice: no bottleneck to replace');
};

/**
 * .what = pins with-bottleneck at a published version, and drops bottleneck unless src imports it.
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents };
  const packageJSON = JSON.parse(contents);
  const dependencies = asDependencies({ contents });

  // keep a valid extant with-bottleneck pin; else pin the published one
  const withBottleneckVersion = asWithBottleneckVersionPinned({
    version: dependencies['with-bottleneck'],
  });

  // keep bottleneck only while a live import still needs it
  const bottleneckVersion = isBottleneckImported(context)
    ? dependencies.bottleneck
    : undefined; // undefined drops the key from the written json

  const updatedPackageJSON = {
    ...packageJSON,
    dependencies: {
      ...dependencies,
      bottleneck: bottleneckVersion,
      'with-bottleneck': withBottleneckVersion,
    },
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
