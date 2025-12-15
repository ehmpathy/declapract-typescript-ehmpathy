import { type FileCheckFunction, type FileFixFunction } from 'declapract';

/**
 * .what = detects relative imports that should use @src alias
 * .why = relative paths are fragile and break when files move
 */

// matches relative imports that go up directories (../)
const RELATIVE_IMPORT_PATTERN = /from\s+['"](\.\.\/)+(.*?)['"]/g;

export const check: FileCheckFunction = (contents, { relativeFilePath }) => {
  if (!contents) throw new Error('does not match bad practice');

  // skip if file is not in src/
  if (!relativeFilePath?.startsWith('src/')) {
    throw new Error('does not match bad practice');
  }

  // check for relative imports that go up directories (../)
  const matches = contents.match(RELATIVE_IMPORT_PATTERN);
  if (matches && matches.length > 0) {
    return; // matches bad practice
  }

  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents, { relativeFilePath }) => {
  if (!contents) return {};
  if (!relativeFilePath?.startsWith('src/')) return {};

  // calculate the path parts of the current file
  const pathParts = relativeFilePath.split('/');
  const srcIndex = pathParts.indexOf('src');

  // replace relative imports with @src imports
  const fixed = contents.replace(
    /from\s+['"]((\.\.\/)+)(.*?)['"]/g,
    (match, dots, _, importPath) => {
      // count how many ../ we have
      const upCount = (dots.match(/\.\.\//g) || []).length;

      // get the directories between src/ and the current file
      const currentDirParts = pathParts.slice(srcIndex + 1, -1);

      // if going up more levels than we have directories, just use @src/importPath
      if (upCount >= currentDirParts.length) {
        return `from '@src/${importPath}'`;
      }

      // otherwise, calculate the remaining path after going up
      const remainingParts = currentDirParts.slice(0, -upCount);
      const targetPath = [...remainingParts, importPath].join('/');
      return `from '@src/${targetPath}'`;
    },
  );

  return { contents: fixed };
};
