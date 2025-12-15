// eslint-disable-next-line import/no-extraneous-dependencies
import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes("from '@ehmpathy/error-fns'")) return; // matches if it includes this
  throw new Error('does not match bad practice'); // does not otherwise
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // do nothing if no contents
  return {
    contents: contents.replace(
      /from '@ehmpathy\/error-fns'/g,
      "from 'helpful-errors'",
    ),
  };
};
