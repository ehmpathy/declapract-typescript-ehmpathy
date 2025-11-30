import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

const depsToRemove = ['prettier', '@trivago/prettier-plugin-sort-imports'];

const scriptsToRemove = ['fix:format:prettier', 'test:format:prettier'];

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJSON = JSON.parse(contents);

  // Remove prettier devDependencies
  const updatedDevDeps = { ...packageJSON.devDependencies };
  for (const dep of depsToRemove) {
    delete updatedDevDeps[dep];
  }

  // Remove prettier scripts
  const updatedScripts = { ...packageJSON.scripts };
  for (const script of scriptsToRemove) {
    delete updatedScripts[script];
  }

  const fixedPackageJSON = {
    ...packageJSON,
    devDependencies:
      Object.keys(updatedDevDeps).length > 0 ? updatedDevDeps : undefined,
    scripts:
      Object.keys(updatedScripts).length > 0 ? updatedScripts : undefined,
  };

  return { contents: JSON.stringify(fixedPackageJSON, null, 2) };
};
