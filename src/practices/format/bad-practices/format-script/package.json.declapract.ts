import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('fine, does not match bad practice'); // if not defined, doesn't have the script
  const parsedContents = JSON.parse(contents);
  if (typeof parsedContents.scripts.format === 'string') return; // matches bad practice file
  throw new Error('fine, does not have format script');
};

export const fix: FileFixFunction = (contents) => {
  // parse the contents
  if (!contents) return {}; // do nothing if no contents, shouldn't have reached here to begin with
  const parsedContents = JSON.parse(contents);

  // remove "format"
  const fixedContents = {
    ...parsedContents,
    scripts: {
      ...parsedContents.scripts,
      format: undefined, // remove format
    },
  };

  // and return the fixed json
  return { contents: JSON.stringify(fixedContents, null, 2) };
};
