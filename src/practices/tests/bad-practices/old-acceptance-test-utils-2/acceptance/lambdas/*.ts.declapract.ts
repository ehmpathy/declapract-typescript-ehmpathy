import { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (
    contents?.includes(
      `import { locally } from '../__test_utils__/environment';`,
    )
  )
    return; // then it matches bad practice
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = async (contents) => {
  if (!contents) return {}; // do nothing if no contents. really, this shouldn't have been called
  return {
    contents: contents.replace(
      // replace the bad import
      `import { locally } from '../__test_utils__/environment';`,
      `import { locally } from '../environment';`,
    ),
  };
};
