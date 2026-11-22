import type { JsoncView } from './asJsoncView';
import { getIndexOfJsoncObjectClose } from './getIndexOfJsoncObjectClose';
import { getOneJsoncDirectMatch } from './getOneJsoncDirectMatch';

/**
 * .what = the body span of the object a direct `"key": {` child opens inside `within`, or null if absent.
 * .why  = scopes each lookup to the block it belongs to: a `baseUrl` under `ts-node` is no tsc option.
 */
export const getOneJsoncObjectSpan = (input: {
  view: JsoncView;
  key: string;
  within: { from: number; until: number };
}): { from: number; until: number } | null => {
  const open = getOneJsoncDirectMatch({
    shape: input.view.shape,
    pattern: new RegExp(`"${input.key}"\\s*:\\s*\\{`),
    within: input.within,
  });
  if (!open) return null;
  const from = open.start + open.match[0].length;
  return {
    from,
    until: getIndexOfJsoncObjectClose({ shape: input.view.shape, from }),
  };
};
