import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * .what = detects the deprecated @/rhachet.use.ts config file
 * .why = this config file pattern has been deprecated and should be removed
 */

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  return { contents: null }; // delete the file
};
