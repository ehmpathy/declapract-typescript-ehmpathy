import { asJsoncParsed } from './asJsoncParsed';
import { isTsconfigWithTs7OptionsKept } from './isTsconfigWithTs7OptionsKept';

/**
 * .what = true when a parsed json value is a plain object.
 * .why  = narrows the parsed tsconfig and its `compilerOptions` with no cast.
 */
const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * .what = a tsconfig with `baseUrl` and `importsNotUsedAsValues` removed, at any value; `paths` goes
 *         too when `baseUrl` was set, since each of its values resolved against `baseUrl`.
 * .why  = typescript 7 removed both options. the best-practice tsconfig then lays down the template's
 *         `paths`, so every repo lands on one alias shape; an import that leaned on the old shape fails
 *         loud on the next typecheck.
 * .note = idempotent: a tsconfig with neither key comes back byte for byte. otherwise the result is
 *         plain json and its comments go, as the best-practice fix writes it too
 */
export const asTsconfigWithTs7OptionsRemoved = (input: {
  contents: string;
}): string => {
  // leave a tsconfig with neither key as written
  if (!isTsconfigWithTs7OptionsKept({ contents: input.contents }))
    return input.contents;
  const tsconfig = asJsoncParsed({ contents: input.contents });
  if (!isJsonObject(tsconfig) || !isJsonObject(tsconfig.compilerOptions))
    return input.contents;

  // drop the removed keys, and the paths that resolved against baseUrl
  const options = tsconfig.compilerOptions;
  const keysDropped = [
    'baseUrl',
    'importsNotUsedAsValues',
    ...('baseUrl' in options ? ['paths'] : []),
  ];
  const optionsKept = Object.fromEntries(
    Object.entries(options).filter(([key]) => !keysDropped.includes(key)),
  );
  return `${JSON.stringify({ ...tsconfig, compilerOptions: optionsKept }, null, 2)}\n`;
};
