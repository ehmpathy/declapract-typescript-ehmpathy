import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

const deprecatedDeps = [
  'babel-jest',
  '@babel/core',
  '@babel/preset-env',
  'core-js',
  'ts-jest',
];

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if no contents
  const packageJSON = JSON.parse(contents);

  // Remove deprecated deps from devDependencies
  const updatedDevDeps = { ...packageJSON.devDependencies };
  for (const dep of deprecatedDeps) {
    delete updatedDevDeps[dep];
  }

  // Remove deprecated deps from dependencies (in case they're there)
  const updatedDeps = { ...packageJSON.dependencies };
  for (const dep of deprecatedDeps) {
    delete updatedDeps[dep];
  }

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
