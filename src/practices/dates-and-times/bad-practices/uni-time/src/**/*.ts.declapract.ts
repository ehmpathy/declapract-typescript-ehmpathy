// eslint-disable-next-line import/no-extraneous-dependencies
import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes("from '@ehmpathy/uni-time'")) return; // matches if it includes this
  throw new Error('does not match bad practice'); // does not otherwise
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // pass through if contents absent
  return {
    contents: contents.replace(
      /from '@ehmpathy\/uni-time'/g,
      "from 'iso-time'",
    ),
  };
};
