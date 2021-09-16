import { FileCheckFunction, FileCheckType, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('does not match bad practice'); // no contents -> fine
  const packageJSON = JSON.parse(contents);
  if (packageJSON.scripts.deploy) return; // bad practice
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if no contents
  const packageJSON = JSON.parse(contents);
  const updatedPackageJSON = {
    ...packageJSON,
    scripts: {
      ...packageJSON.scripts,
      deploy: undefined, // remove the deploy script
    },
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
