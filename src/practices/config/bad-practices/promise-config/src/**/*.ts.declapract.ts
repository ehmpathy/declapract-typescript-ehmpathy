import { FileCheckFunction, FileCheckType, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (
    contents?.includes('import { promiseConfig } from') ||
    contents?.includes('promiseConfig()')
  )
    return; // matches if it includes this
  throw new Error('does not match bad practice'); // does not otherwise
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // do nothing if no contents
  return {
    contents: contents
      .replace(/import \{ promiseConfig \} from/g, 'import { getConfig } from')
      .replace(/promiseConfig\(\)/g, 'getConfig()'),
  };
};
