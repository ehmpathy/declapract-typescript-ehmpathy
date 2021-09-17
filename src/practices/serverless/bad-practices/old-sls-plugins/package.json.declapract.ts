import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if no contents
  const packageJSON = JSON.parse(contents);
  const updatedPackageJSON = {
    ...packageJSON,
    devDependencies: {
      ...packageJSON.devDependencies,
      'serverless-offline': undefined, // remove the dep
      'serverless-pseudo-parameters': undefined, // remove the deploy script
    },
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
