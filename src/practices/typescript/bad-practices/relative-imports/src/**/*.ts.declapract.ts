import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects relative imports that should use @src alias
 * .why = relative paths are fragile and break when files move
 */

// matches relative imports that go up directories (../)
const RELATIVE_IMPORT_PATTERN = /from\s+['"](\.\.\/)+(.*?)['"]/g;

const isInPracticesDir = (relativeFilePath: string | undefined): boolean =>
  relativeFilePath?.includes('src/practices/') ?? false;

const isDeclapractFile = (relativeFilePath: string | undefined): boolean =>
  relativeFilePath?.endsWith('.declapract.ts') ?? false;

/**
 * skip files in src/practices/ because they are templates defining what target
 * codebases should look like - not actual config files to be fixed. however,
 * .declapract.ts files contain check/fix logic (not template content) so they
 * should still be processed normally by other practices.
 */
const shouldSkip = (relativeFilePath: string | undefined): boolean =>
  isInPracticesDir(relativeFilePath) && !isDeclapractFile(relativeFilePath);

export const check: FileCheckFunction = (contents, { relativeFilePath }) => {
  if (!contents) throw new Error('does not match bad practice');

  // skip if file is not in src/
  if (!relativeFilePath?.startsWith('src/')) {
    throw new Error('does not match bad practice');
  }

  // skip practice template files
  if (shouldSkip(relativeFilePath)) {
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
  if (shouldSkip(relativeFilePath)) return {};

  // calculate the path parts of the current file
  const pathParts = relativeFilePath.split('/');
  const srcIndex = pathParts.indexOf('src');

  // get the directories between src/ and the current file
  const currentDirParts = pathParts.slice(srcIndex + 1, -1);

  // replace relative imports with @src imports (only if they stay within src/)
  const fixed = contents.replace(
    /from\s+['"]((\.\.\/)+)(.*?)['"]/g,
    (match, dots, _, importPath) => {
      // count how many ../ we have
      const upCount = (dots.match(/\.\.\//g) || []).length;

      // if going up more levels than we have directories within src/, it goes OUTSIDE src
      // leave these imports unchanged (e.g., ../../package.json from src/utils/index.ts)
      if (upCount > currentDirParts.length) {
        return match;
      }

      // if going up exactly as many levels as we have directories, target is at src root
      if (upCount === currentDirParts.length) {
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
