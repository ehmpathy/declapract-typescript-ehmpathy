import type { FileCheckFunction, FileFixFunction } from 'declapract';

import {
  hasBareDeprecatedDirSpecifier,
  withBareDeprecatedDirSpecifiersRepointed,
} from '../../../../../../utils/asBareDeprecatedDirSpecifierReplacement';
import { isDeferredToDeprecatedDirMove } from '../../../../../../utils/isDeferredToDeprecatedDirMove';

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

/**
 * .what = each slash-suffixed old dir specifier, repointed at its new dir
 * .note = ordered most specific first, so `/data/dao` is read before `/data/`
 */
const withOldDirSpecifiersRepointed = (input: { contents: string }): string =>
  input.contents
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

export const check: FileCheckFunction = (contents, context) => {
  if (!contents) throw new Error('no contents');

  // defer a file still under a deprecated dir to its peer dir-move: the move
  // relocates it this pass, then this rewrite fires at the new path next pass.
  // the two never touch one file in one apply, so no relocate+rewrite ENOENT.
  if (
    isDeferredToDeprecatedDirMove({
      relativeFilePath: context?.relativeFilePath,
    })
  )
    throw new Error('deferred to peer dir-move this pass');

  // check if any old import path pattern matches
  const hasOldImport = OLD_PATH_PATTERNS.some((pattern) =>
    pattern.test(contents),
  );
  if (hasOldImport) return; // matches bad practice

  // a bare barrel import ('@src/domain', '../../domain') — the same specifier set the fix repoints (#671)
  if (
    hasBareDeprecatedDirSpecifier({
      contents,
      relativeFilePath: context?.relativeFilePath ?? null,
    })
  )
    return; // matches bad practice

  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents };

  // repoint each bare barrel import first, so the slash-suffixed rewrites below never see it (#655)
  const barrelsRepointed = withBareDeprecatedDirSpecifiersRepointed({
    contents,
    relativeFilePath: context?.relativeFilePath ?? null,
  });

  // repoint each slash-suffixed old dir specifier
  return {
    contents: withOldDirSpecifiersRepointed({ contents: barrelsRepointed }),
  };
};
