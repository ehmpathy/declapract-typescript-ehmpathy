import { type FileCheckFunction, type FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes('__PARAM__')) return; // bad practice detected
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  return {
    contents: contents.replace(/"__PARAM__"/g, '"$.at(aws::param)"'),
  };
};
