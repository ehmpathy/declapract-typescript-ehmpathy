import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // do nothing if no contents
  const packageJSON = JSON.parse(contents);
  const updatedPackageJSON = {
    ...packageJSON,
    scripts: {
      ...packageJSON.scripts,
      'provision:docker:clear': undefined,
      'provision:docker:prepare': undefined,
      'provision:docker:up': undefined,
      'provision:docker:await': undefined,
      'provision:docker:down': undefined,
    },
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
