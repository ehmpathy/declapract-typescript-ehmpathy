import type { FileCheckFunction, FileFixFunction } from 'declapract';

// patterns to detect old import paths
const OLD_PATH_PATTERNS = [
  /from\s+['"][^'"]*\/data\/dao/,
  /from\s+['"][^'"]*\/data\/clients/,
  /from\s+['"][^'"]*\/data\//,
  /from\s+['"][^'"]*\/domain\/objects/,
  /from\s+['"][^'"]*\/domain\//,
  /from\s+['"][^'"]*\/logic\//,
];

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('no contents');

  // check if any old import path pattern matches
  const hasOldImport = OLD_PATH_PATTERNS.some((pattern) =>
    pattern.test(contents),
  );

  if (hasOldImport) return; // matches bad practice
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  // fix imports in order of specificity (most specific first)
  const fixed = contents
    // data layer fixes
    .replace(/(['"])([^'"]*?)\/data\/dao\b/g, '$1$2/access/daos')
    .replace(/(['"])([^'"]*?)\/data\/clients\b/g, '$1$2/access/sdks')
    .replace(/(['"])([^'"]*?)\/data\//g, '$1$2/access/')
    // domain layer fixes
    .replace(/(['"])([^'"]*?)\/domain\/objects\b/g, '$1$2/domain.objects')
    .replace(/(['"])([^'"]*?)\/domain\//g, '$1$2/domain.objects/')
    // logic layer fixes
    .replace(/(['"])([^'"]*?)\/logic\//g, '$1$2/domain.operations/');

  return { contents: fixed };
};
