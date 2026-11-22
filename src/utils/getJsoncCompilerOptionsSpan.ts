import type { JsoncView } from './asJsoncView';
import { getIndexOfJsoncObjectClose } from './getIndexOfJsoncObjectClose';
import { getOneJsoncObjectSpan } from './getOneJsoncObjectSpan';

/**
 * .what = the body span of a tsconfig's top-level `compilerOptions`, or null when it declares none.
 * .why  = every option tsc reads lives there; a `compilerOptions` nested under `ts-node` is skipped.
 */
export const getJsoncCompilerOptionsSpan = (input: {
  view: JsoncView;
}): { from: number; until: number } | null => {
  const rootOpen = input.view.shape.indexOf('{');
  if (rootOpen === -1) return null;
  const from = rootOpen + 1;
  return getOneJsoncObjectSpan({
    view: input.view,
    key: 'compilerOptions',
    within: {
      from,
      until: getIndexOfJsoncObjectClose({ shape: input.view.shape, from }),
    },
  });
};
