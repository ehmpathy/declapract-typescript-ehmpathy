import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = whether a module specifier names the hand-written `src/utils/config/Config.ts`
 * .why  = two shapes reach it: `…/utils/config/Config` from anywhere, and `./Config` from a file
 *         inside `src/utils/config/`. a `Config` module anywhere else is the repo's own and is left
 *         alone.
 */
const isHandWrittenConfigSpecifier = (input: {
  specifier: string;
  relativeFilePath: string;
}): boolean => {
  if (/(^|\/)utils\/config\/Config$/.test(input.specifier)) return true;
  return (
    input.specifier === './Config' &&
    /^src\/utils\/config\/[^/]+$/.test(input.relativeFilePath)
  );
};

// the static `from '<specifier>'` clause whose specifier the check reads for a config import
const FROM_SPECIFIER_PATTERN = /(\bfrom\s+)(['"])([^'"]+)\2/g;

/**
 * .what = repoint each import of the hand-written Config.ts to config.schema
 */
const asContentsWithConfigSchemaImports = (input: {
  contents: string;
  relativeFilePath: string;
}): string =>
  input.contents.replace(
    FROM_SPECIFIER_PATTERN,
    (match, from: string, quote: string, specifier: string) =>
      isHandWrittenConfigSpecifier({
        specifier,
        relativeFilePath: input.relativeFilePath,
      })
        ? `${from}${quote}${specifier.replace(/Config$/, 'config.schema')}${quote}`
        : match,
  );

/**
 * .what = flags a source file that imports the hand-written Config.ts (#661)
 */
export const check: FileCheckFunction = (contents, context) => {
  if (
    contents &&
    asContentsWithConfigSchemaImports({
      contents,
      relativeFilePath: context.relativeFilePath,
    }) !== contents
  )
    return; // imports the hand-written Config.ts → bad practice
  throw new Error('does not import the hand-written Config.ts');
};

/**
 * .what = repoints each import of the hand-written Config.ts to config.schema, which exports the
 *         schema-inferred Config
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return {};
  return {
    contents: asContentsWithConfigSchemaImports({
      contents,
      relativeFilePath: context.relativeFilePath,
    }),
  };
};
