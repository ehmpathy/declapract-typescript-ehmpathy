import type { JsoncView } from './asJsoncView';
import { getJsoncCompilerOptionsSpan } from './getJsoncCompilerOptionsSpan';
import { getOneJsoncDirectMatch } from './getOneJsoncDirectMatch';

/**
 * .what = the span of one direct `"key": "value"` entry of a tsconfig's top-level `compilerOptions`,
 *         and its string value, or null when the key is absent there.
 * .why  = each ts7 tsconfig bad-practice reads an option this way: the edits need the entry's offsets
 *         to splice, and the checks need its value; a key in a comment or a nested block never counts.
 */
export const getOneJsoncCompilerOptionString = (input: {
  view: JsoncView;
  key: string;
}): { start: number; end: number; value: string } | null => {
  const within = getJsoncCompilerOptionsSpan({ view: input.view });
  if (!within) return null;
  const found = getOneJsoncDirectMatch({
    shape: input.view.shape,
    pattern: new RegExp(`"${input.key}"\\s*:\\s*"((?:[^"\\\\\\n]|\\\\.)*)"`),
    within,
  });
  if (!found) return null;
  const start = found.start;
  const end = start + found.match[0].length;
  const valueLength = found.match[1]?.length ?? 0;
  return {
    start,
    end,
    value: input.view.text.slice(end - 1 - valueLength, end - 1),
  };
};
