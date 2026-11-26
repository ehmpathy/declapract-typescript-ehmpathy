import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asTsconfigWithSrcAliasRemoved } from '../../../../utils/asTsconfigWithSrcAliasRemoved';
import { isTsconfigWithSrcAliasKept } from '../../../../utils/isTsconfigWithSrcAliasKept';

/**
 * .what = flags a tsconfig whose `paths` still declares the retired `@src/*` key
 */
export const check: FileCheckFunction = (contents) => {
  if (contents && isTsconfigWithSrcAliasKept({ contents })) return; // bad practice detected
  throw new Error('does not match bad practice: no @src/* paths key');
};

/**
 * .what = drops the `@src/*` key; every other alias the adopter declared stays
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return { contents: asTsconfigWithSrcAliasRemoved({ contents }) };
};
