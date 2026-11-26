import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asSourceWithSrcAliasRepointed } from '../../../../../../utils/asSourceWithSrcAliasRepointed';
import { isDeferredToDeprecatedDirMove } from '../../../../../../utils/isDeferredToDeprecatedDirMove';
import { isSourceWithSrcAliasKept } from '../../../../../../utils/isSourceWithSrcAliasKept';

/**
 * .what = flags a source file that names a module through the retired `@src/` alias
 * .note = a file still under a deprecated dir defers to its peer dir-move: the move relocates it this
 *         pass, then this rewrite fires at the new path next pass, so no relocate+rewrite ENOENT
 */
export const check: FileCheckFunction = (contents, context) => {
  if (isDeferredToDeprecatedDirMove({ relativeFilePath: context?.relativeFilePath }))
    throw new Error('deferred to peer dir-move this pass');
  if (contents && isSourceWithSrcAliasKept({ contents })) return; // bad practice detected
  throw new Error('does not match bad practice: no @src/ specifier');
};

/**
 * .what = repoints each quoted `@src/` specifier at `@/src/`
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents };
  if (isDeferredToDeprecatedDirMove({ relativeFilePath: context?.relativeFilePath }))
    return { contents };
  return { contents: asSourceWithSrcAliasRepointed({ contents }) };
};
