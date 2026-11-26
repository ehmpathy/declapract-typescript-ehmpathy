import { asJsoncParsed } from './asJsoncParsed';
import { isJsonObject } from './asJsonMergedDeep';

/**
 * .what = true when a tsconfig's top-level `compilerOptions` sets `baseUrl` or `importsNotUsedAsValues`,
 *         at any value.
 * .why  = typescript 7 removed both (TS5102, TS5023); the bad-practice check and its fix read the same
 *         keys, so what the check flags the fix clears.
 */
export const isTsconfigWithTs7OptionsKept = (input: {
  contents: string;
}): boolean => {
  const tsconfig = asJsoncParsed({ contents: input.contents });
  if (!isJsonObject(tsconfig) || !isJsonObject(tsconfig.compilerOptions))
    return false;
  return (
    'baseUrl' in tsconfig.compilerOptions ||
    'importsNotUsedAsValues' in tsconfig.compilerOptions
  );
};
