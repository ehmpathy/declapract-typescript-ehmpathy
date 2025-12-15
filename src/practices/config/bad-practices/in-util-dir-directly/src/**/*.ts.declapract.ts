import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes(`../utils/config'`)) return; // if it includes this string, then its a bad practice
  throw new Error('its not bad practice'); // otherwise, not bad practice
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // should not be called if no contents
  return {
    contents: contents.replace(
      /\.\.\/utils\/config'/g,
      "../utils/config/getConfig'",
    ),
  };
};
