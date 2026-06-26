import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * .what = detects committed peer-review artifacts under .behavior/**\/.reviews
 * .why = peer-review files are noise; far less important than the root behavior
 *        files, so they should not be tracked in git
 *
 * .note = matches the old flat shape, where peer-review files sit directly in
 *         .reviews with `peer-review` in the filename
 */

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  return { contents: null }; // delete the file
};
