import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * .what = detects committed peer-review artifacts under .behavior/**\/.reviews/peer
 * .why = peer-review files are noise; far less important than the root behavior
 *        files, so they should not be tracked in git
 *
 * .note = matches the new shape, where all peer-review files live under a
 *         dedicated `peer` directory
 */

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = () => {
  return { contents: null }; // delete the file
};
