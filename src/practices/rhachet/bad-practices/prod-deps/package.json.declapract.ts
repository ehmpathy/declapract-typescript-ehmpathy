import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects rhachet and rhachet-* packages in production dependencies
 * .why = these packages should be devDependencies or peerDependencies, never direct prod deps
 */

const rhachetPackagePattern = /^rhachet(-.*)?$/;

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('does not match bad practice');

  const packageJSON = JSON.parse(contents);
  const prodDeps = Object.keys(packageJSON.dependencies ?? {});

  // check if any rhachet package is in prod dependencies
  const rhachetInProdDeps = prodDeps.some((dep) =>
    rhachetPackagePattern.test(dep),
  );

  if (rhachetInProdDeps) return; // matches bad practice
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJSON = JSON.parse(contents);
  const prodDeps = { ...packageJSON.dependencies };
  const devDeps = { ...packageJSON.devDependencies };

  // find all rhachet packages in prod deps and move them to dev deps
  for (const dep of Object.keys(prodDeps)) {
    if (rhachetPackagePattern.test(dep)) {
      devDeps[dep] = prodDeps[dep];
      delete prodDeps[dep];
    }
  }

  const fixedPackageJSON = {
    ...packageJSON,
    dependencies: Object.keys(prodDeps).length > 0 ? prodDeps : undefined,
    devDependencies: Object.keys(devDeps).length > 0 ? devDeps : undefined,
  };

  return { contents: JSON.stringify(fixedPackageJSON, null, 2) };
};
