import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * check if file has imports from __test_utils__ or __test_assets__ directories
 */
export const check: FileCheckFunction = (contents) => {
  if (contents?.includes('__test_utils__')) return; // matches bad practice
  if (contents?.includes('__test_assets__')) return; // matches bad practice
  throw new Error('does not match bad practice');
};

/**
 * replace __test_utils__ and __test_assets__ with .test/assets in import paths
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};

  // simple string replacement - the relative path stays the same, only the directory name changes
  // e.g., from '../__test_utils__/foo' to '../.test/assets/foo'
  const fixedContents = contents
    .replace(/__test_utils__\//g, '.test/assets/')
    .replace(/__test_assets__\//g, '.test/assets/');

  return {
    contents: fixedContents,
  };
};
