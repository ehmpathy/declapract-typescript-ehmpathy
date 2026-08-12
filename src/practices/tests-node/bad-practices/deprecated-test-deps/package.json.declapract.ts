import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

const deprecatedDeps = [
  'babel-jest',
  '@babel/core',
  '@babel/preset-env',
  'core-js',
  'ts-jest',
];

/**
 * .what = returns a deps map with every deprecated key removed, without any mutation
 * .why  = the fix strips deprecated test deps; rule.require.immutable-vars forbids a
 *         delete-in-place on the copied deps object, so it filters into a fresh map instead
 */
const withoutDeprecatedDeps = (
  deps: Record<string, string> | undefined,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(deps ?? {}).filter(([dep]) => !deprecatedDeps.includes(dep)),
  );

/**
 * .what = removes the deprecated node-jest test deps from a package.json's
 *         dependencies + devDependencies
 * .why  = deps like babel-jest, ts-jest, @babel/* belong to the retired node-jest
 *         toolchain; a repo on the @swc/jest config no longer needs them, so this
 *         bad-practice fix drops them
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // no-op when the file is absent
  const packageJSON = JSON.parse(contents);

  // remove deprecated deps from devDependencies + dependencies (non-mutating filter)
  const updatedDevDeps = withoutDeprecatedDeps(packageJSON.devDependencies);
  const updatedDeps = withoutDeprecatedDeps(packageJSON.dependencies);

  const updatedPackageJSON = {
    ...packageJSON,
    dependencies: Object.keys(updatedDeps).length > 0 ? updatedDeps : undefined,
    devDependencies:
      Object.keys(updatedDevDeps).length > 0 ? updatedDevDeps : undefined,
  };

  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
