import { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  const packageJSONObject = JSON.parse(contents!);
  if (
    Object.keys(packageJSONObject.dependencies).includes('simple-type-guards')
  )
    return; // matches
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // should not occur
  const packageJSONObject = JSON.parse(contents);
  const fixedPackageJSONObject = {
    ...packageJSONObject,
    dependencies: {
      ...packageJSONObject.dependencies,
      'simple-type-guards': undefined,
    },
  };
  return { contents: JSON.stringify(fixedPackageJSONObject, null, 2) };
};
