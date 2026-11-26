import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asSourceWithSrcAliasRepointed } from '../../../../../../utils/asSourceWithSrcAliasRepointed';
import { isSourceWithSrcAliasKept } from '../../../../../../utils/isSourceWithSrcAliasKept';

/**
 * .what = flags a blackbox test that names a module through the retired `@src/` alias
 * .why  = acceptance tests import shared fixtures from `src/`; they read `@/src/...` too
 */
export const check: FileCheckFunction = (contents) => {
  if (contents && isSourceWithSrcAliasKept({ contents })) return; // bad practice detected
  throw new Error('does not match bad practice: no @src/ specifier');
};

/**
 * .what = repoints each quoted `@src/` specifier at `@/src/`
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return { contents: asSourceWithSrcAliasRepointed({ contents }) };
};
