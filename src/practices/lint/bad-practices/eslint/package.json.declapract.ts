import type { FileCheckFunction, FileFixFunction } from 'declapract';

const depsBlocklist = [
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint',
  'eslint-config-airbnb-typescript',
  'eslint-config-prettier',
  'eslint-plugin-import',
  'eslint-plugin-prettier',
  'eslint-plugin-unused-imports',
];

const scriptsBlocklist = ['test:lint:eslint'];

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw Error('does not match bad practice');
  const packageJSONObject = JSON.parse(contents);
  const devDepsFound = Object.keys(packageJSONObject.devDependencies ?? {});
  const scriptsFound = Object.keys(packageJSONObject.scripts ?? {});
  if (
    depsBlocklist.some((dep) => devDepsFound.includes(dep)) ||
    scriptsBlocklist.some((script) => scriptsFound.includes(script))
  )
    return; // matches bad practice
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // should not occur
  const packageJSONObject = JSON.parse(contents);

  // Remove blocklisted devDependencies
  const updatedDevDeps = { ...packageJSONObject.devDependencies };
  for (const dep of depsBlocklist) {
    delete updatedDevDeps[dep];
  }

  // Remove blocklisted scripts
  const updatedScripts = { ...packageJSONObject.scripts };
  for (const script of scriptsBlocklist) {
    delete updatedScripts[script];
  }

  const fixedPackageJSONObject = {
    ...packageJSONObject,
    devDependencies: updatedDevDeps,
    scripts: packageJSONObject.scripts ? updatedScripts : undefined,
  };
  return { contents: JSON.stringify(fixedPackageJSONObject, null, 2) };
};
