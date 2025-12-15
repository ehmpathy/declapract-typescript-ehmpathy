import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes('.valid(Object.values(')) return; // matches bad practice if this is found
  throw new Error('passes, does not match bad practice');
};
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  return {
    contents: contents.replace(
      /\.valid\(Object\.values/g,
      '.valid(...Object.values',
    ),
  };
};
