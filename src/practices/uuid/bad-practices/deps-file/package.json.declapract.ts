import { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  const packageJSONObject = JSON.parse(contents!);
  if (Object.keys(packageJSONObject.dependencies).includes('uuid')) return; // matches
  if (Object.keys(packageJSONObject.devDependencies).includes('@types/uuid'))
    return; // matches
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // should not occur
  const packageJSONObject = JSON.parse(contents);
  const fixedPackageJSONObject = {
    ...packageJSONObject,
    dependencies: { ...packageJSONObject.dependencies, uuid: undefined },
    devDependencies: {
      ...packageJSONObject.dependencies,
      '@types/uuid': undefined,
    },
  };
  return { contents: JSON.stringify(fixedPackageJSONObject, null, 2) };
};
