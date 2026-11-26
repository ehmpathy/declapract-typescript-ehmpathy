import { asJsoncParsed } from './asJsoncParsed';
import { isJsonObject } from './asJsonMergedDeep';

/**
 * .what = true when a tsconfig's `compilerOptions.paths` still declares the retired `@src/*` key
 * .why  = `@/` is the one path anchor; the bad-practice check and its fix read the same key, so what
 *         the check flags the fix clears
 */
export const isTsconfigWithSrcAliasKept = (input: { contents: string }): boolean => {
  const tsconfig = asJsoncParsed({ contents: input.contents });
  if (!isJsonObject(tsconfig) || !isJsonObject(tsconfig.compilerOptions)) return false;
  const paths = tsconfig.compilerOptions.paths;
  return isJsonObject(paths) && '@src/*' in paths;
};
