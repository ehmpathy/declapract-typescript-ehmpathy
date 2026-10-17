import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';

/**
 * .what = detects a test tool the tests-any practice floors in `devDependencies` that ALSO (or
 *         only) sits in `dependencies`
 * .why  = the best-practice floor raises the `devDependencies` entry alone. a stale duplicate in
 *         `dependencies` wins the install, so plan reports the floor met while the old release
 *         lands, and jest cannot load a reporter or setup that release predates (#657)
 */
const PRACTICE = 'tests-any/dev-tool-in-dependencies';

// the test tools tests-any declares in devDependencies (its best-practice package.json)
export const DEV_TOOLS = [
  '@jest/globals',
  '@types/jest',
  'esbuild-register',
  'jest',
  'test-fns',
  'tsx',
];

export const check: FileCheckFunction = (contents) => {
  if (!contents)
    throw new Error(
      `does not match bad practice: [${PRACTICE}] package.json has no contents to scan`,
    );

  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const prodDeps = Object.keys(packageJSON.dependencies ?? {});

  // a dev tool in dependencies = the bad practice
  if (prodDeps.some((dep) => DEV_TOOLS.includes(dep))) return;

  throw new Error(
    'does not match bad practice: no tests-any dev tool in dependencies',
  );
};

/**
 * .what = remove each dev tool from prod deps; carry its version into dev deps only where dev
 *         deps lacks it, so an extant dev deps entry (the one the floor raises) wins
 * .why  = names the relocation as one intent, via a pure partition (inputs untouched)
 */
const withDevToolsMovedToDevDeps = (input: {
  prodDeps: Record<string, string>;
  devDeps: Record<string, string>;
}): { prodDeps: Record<string, string>; devDeps: Record<string, string> } => {
  const prodEntries = Object.entries(input.prodDeps);
  const relocated = prodEntries.filter(([dep]) => DEV_TOOLS.includes(dep));
  const retained = prodEntries.filter(([dep]) => !DEV_TOOLS.includes(dep));
  return {
    prodDeps: Object.fromEntries(retained),
    devDeps: { ...Object.fromEntries(relocated), ...input.devDeps },
  };
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });

  // relocate every dev tool out of prod deps
  const { prodDeps, devDeps } = withDevToolsMovedToDevDeps({
    prodDeps: { ...packageJSON.dependencies },
    devDeps: { ...packageJSON.devDependencies },
  });

  // keep each section's presence: a declared section stays; dev deps is added only when the move
  // lands a package into it
  const fixedPackageJSON = {
    ...packageJSON,
    ...('dependencies' in packageJSON ? { dependencies: prodDeps } : {}),
    ...('devDependencies' in packageJSON || Object.keys(devDeps).length > 0
      ? { devDependencies: devDeps }
      : {}),
  };

  return { contents: JSON.stringify(fixedPackageJSON, null, 2) };
};
