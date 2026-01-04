import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects imports that reference acceptance/ directory
 * .why = acceptance/ has been renamed to blackbox/
 */
export const check: FileCheckFunction = (contents) => {
  // match imports that reference acceptance/ directory
  if (contents?.match(/from ['"]\.\.?\/.*acceptance\//)) return; // matches bad practice
  if (contents?.match(/from ['"]acceptance\//)) return; // matches bad practice
  throw new Error('does not match bad practice');
};

/**
 * .what = replaces acceptance/ with blackbox/ in import paths
 * .why = blackbox/ naming makes the testing philosophy explicit
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  return {
    contents: contents
      .replace(/(['"])(.*)\/acceptance\//g, '$1$2/blackbox/')
      .replace(/(['"])acceptance\//g, '$1blackbox/'),
  };
};
