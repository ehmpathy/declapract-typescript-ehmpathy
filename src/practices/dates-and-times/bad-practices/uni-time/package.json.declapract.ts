// eslint-disable-next-line import/no-extraneous-dependencies
import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // pass through if contents absent
  const packageJSON = JSON.parse(contents);
  const updatedPackageJSON = {
    ...packageJSON,
    dependencies: {
      ...packageJSON.dependencies,
      '@ehmpathy/uni-time': undefined,
    },
    devDependencies: {
      ...packageJSON.devDependencies,
      '@ehmpathy/uni-time': undefined,
    },
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
