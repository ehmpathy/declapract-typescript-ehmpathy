import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asTsconfigWithTs7OptionsFolded } from '../../../../utils/asTsconfigWithTs7OptionsFolded';
import { isTsconfigTs7OptionFoldable } from '../../../../utils/isTsconfigTs7OptionFoldable';

/**
 * .what = flags a tsconfig whose `compilerOptions` sets an option typescript 7 removed: `baseUrl`
 *         (TS5102) or `importsNotUsedAsValues: "remove"` (TS5023).
 * .why  = the typescript-node floor is typescript 7, where each option is a hard error; and the
 *         best-practice contains-check adds keys but never deletes one.
 */
export const check: FileCheckFunction = (contents) => {
  if (isTsconfigTs7OptionFoldable({ contents: contents ?? '' })) return; // bad practice detected
  throw new Error(
    'does not match bad practice: no baseUrl, no importsNotUsedAsValues "remove"',
  );
};

/**
 * .what = drops `importsNotUsedAsValues: "remove"`, and folds `baseUrl` into `paths`, as a text edit.
 * .why  = the fold lives in `asTsconfigWithTs7OptionsFolded`, which the best-practice tsconfig fix
 *         calls too, so the tsconfig converges whichever of the two declapract fixes first.
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents };
  return {
    contents: asTsconfigWithTs7OptionsFolded({
      contents,
      root: context.getProjectRootDirectory(),
    }),
  };
};
