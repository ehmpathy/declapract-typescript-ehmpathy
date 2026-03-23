import type { FileCheckFunction, FileFixFunction } from 'declapract';

// patterns to detect old import paths
const OLD_PATH_PATTERNS = [
  /from\s+['"][^'"]*\/data\/dao/,
  /from\s+['"][^'"]*\/data\/clients/,
  /from\s+['"][^'"]*\/data\//,
  /from\s+['"][^'"]*\/domain\/objects/,
  /from\s+['"][^'"]*\/domain\//,
  /from\s+['"][^'"]*\/logic\//,
  /from\s+['"][^'"]*\/model\/domainObjects/,
  /from\s+['"][^'"]*\/model\//,
  /from\s+['"][^'"]*\/services\//,
  /from\s+['"][^'"]*\/__nonpublished_modules__\//,
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
    .replace(/(['"])([^'"]*?)\/logic\//g, '$1$2/domain.operations/')
    // model layer fixes (old structure before domain.objects)
    .replace(/(['"])([^'"]*?)\/model\/domainObjects\b/g, '$1$2/domain.objects')
    .replace(/(['"])([^'"]*?)\/model\//g, '$1$2/domain.objects/')
    // services layer fixes (services = business logic, not service clients)
    .replace(/(['"])([^'"]*?)\/services\//g, '$1$2/domain.operations/')
    // nonpublished modules dir fix
    .replace(
      /(['"])([^'"]*?)\/__nonpublished_modules__\//g,
      '$1$2/_topublish/',
    );

  return { contents: fixed };
};
