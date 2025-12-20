import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * .what = flag repos that have changelog.md
 * .why = our new please-release action embeds changelog in PR description, no file needed
 */
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  return { contents: null }; // delete the file
};
