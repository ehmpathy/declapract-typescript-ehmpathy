import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asTsconfigWithTs7OptionsRemoved } from '../../../../utils/asTsconfigWithTs7OptionsRemoved';
import { isTsconfigWithTs7OptionsKept } from '../../../../utils/isTsconfigWithTs7OptionsKept';

/**
 * .what = flags a tsconfig whose `compilerOptions` sets `baseUrl` or `importsNotUsedAsValues`.
 * .why  = typescript 7 removed both (TS5102, TS5023); the best-practice contains-check adds keys but
 *         never deletes one.
 */
export const check: FileCheckFunction = (contents) => {
  if (isTsconfigWithTs7OptionsKept({ contents: contents ?? '' })) return; // bad practice detected
  throw new Error(
    'does not match bad practice: no baseUrl, no importsNotUsedAsValues',
  );
};

/**
 * .what = removes `baseUrl` (with the `paths` it anchored) and `importsNotUsedAsValues`.
 * .why  = the best-practice tsconfig then lays down the template's `paths`; it calls the same removal,
 *         so the tsconfig converges whichever fix declapract runs first.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  return { contents: asTsconfigWithTs7OptionsRemoved({ contents }) };
};
