import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const packageJSON = JSON.parse(contents);
  const updatedPackageJSON = {
    ...packageJSON,
    dependencies: {
      ...packageJSON.dependencies,
      'config-with-paramstore': undefined,
    },
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
