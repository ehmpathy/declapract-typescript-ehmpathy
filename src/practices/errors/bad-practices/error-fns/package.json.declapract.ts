// eslint-disable-next-line import/no-extraneous-dependencies
import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if no contents
  const packageJSON = JSON.parse(contents);
  const updatedPackageJSON = {
    ...packageJSON,
    dependencies: {
      ...packageJSON.dependencies,
      '@ehmpathy/error-fns': undefined,
    },
    devDependencies: {
      ...packageJSON.devDependencies,
      '@ehmpathy/error-fns': undefined,
    },
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
