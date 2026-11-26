import { asJsoncParsed } from './asJsoncParsed';
import { isJsonObject } from './asJsonMergedDeep';
import { isTsconfigWithSrcAliasKept } from './isTsconfigWithSrcAliasKept';

/**
 * .what = a tsconfig with the retired `@src/*` key dropped from `compilerOptions.paths`
 * .why  = `@/` is the one path anchor (`"@/*": ["./*"]`, imports read `@/src/...`); the best-practice
 *         tsconfig lays down that key, and every other alias key the adopter declared stays
 * .note = idempotent: a tsconfig with no `@src/*` key comes back byte for byte. otherwise the result is
 *         plain json and its comments go, as the best-practice fix writes it too
 */
export const asTsconfigWithSrcAliasRemoved = (input: { contents: string }): string => {
  // leave a tsconfig with no `@src/*` key as written
  if (!isTsconfigWithSrcAliasKept({ contents: input.contents })) return input.contents;
  const tsconfig = asJsoncParsed({ contents: input.contents });
  if (!isJsonObject(tsconfig) || !isJsonObject(tsconfig.compilerOptions)) return input.contents;
  const paths = tsconfig.compilerOptions.paths;
  if (!isJsonObject(paths)) return input.contents;

  // drop the retired key, keep every other alias the adopter declared
  const pathsKept = Object.fromEntries(Object.entries(paths).filter(([key]) => key !== '@src/*'));
  const compilerOptions = { ...tsconfig.compilerOptions, paths: pathsKept };
  return `${JSON.stringify({ ...tsconfig, compilerOptions }, null, 2)}\n`;
};
