import { asJsoncView } from './asJsoncView';
import { getOneJsoncCompilerOptionString } from './getOneJsoncCompilerOptionString';
import { isTsconfigImportsOptionDroppable } from './isTsconfigImportsOptionDroppable';

/**
 * .what = true when a tsconfig's `compilerOptions` sets an option typescript 7 removed that
 *         `asTsconfigWithTs7OptionsFolded` clears: `baseUrl`, or `importsNotUsedAsValues: "remove"`.
 * .why  = reads through the same option reader the fold edits by, so what this flags the fold always
 *         clears, and this never fires again on the folded output.
 */
export const isTsconfigTs7OptionFoldable = (input: { contents: string }): boolean => {
  const view = asJsoncView({ contents: input.contents });
  return (
    getOneJsoncCompilerOptionString({ view, key: 'baseUrl' }) !== null ||
    isTsconfigImportsOptionDroppable({ view })
  );
};
