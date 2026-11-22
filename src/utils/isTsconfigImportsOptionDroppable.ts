import type { JsoncView } from './asJsoncView';
import { getOneJsoncCompilerOptionString } from './getOneJsoncCompilerOptionString';

/**
 * .what = true when a tsconfig's `compilerOptions` sets `importsNotUsedAsValues: "remove"`, outside a comment.
 * .why  = `remove` is the default elision, so its drop changes no emit. `preserve` and `error` keep
 *         or police a type-only import's `require`, so their drop would change emit in silence; those
 *         two are the manual bad-practice `imports-not-used-as-values-kept`, never an automatic fix.
 */
export const isTsconfigImportsOptionDroppable = (input: { view: JsoncView }): boolean =>
  getOneJsoncCompilerOptionString({
    view: input.view,
    key: 'importsNotUsedAsValues',
  })?.value === 'remove';
