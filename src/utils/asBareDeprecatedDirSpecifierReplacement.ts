import path from 'node:path';

/**
 * .what = each deprecated src dir, and the dir its barrel moved into.
 */
const DEPRECATED_DIR_REPLACEMENTS: Record<string, string> = {
  domain: 'domain.objects',
  model: 'domain.objects',
  data: 'access',
  logic: 'domain.operations',
  services: 'domain.operations',
  __nonpublished_modules__: '_topublish',
};

/**
 * .what = the module specifiers of a file — static, side-effect, dynamic, and require forms.
 * .note = group 2 = the quote, group 3 = the specifier.
 * .note = global (`/g`), so `.test()` and `.exec()` carry `lastIndex` across calls; use it only via
 *         `.replace` / `.matchAll`, or copy it with `new RegExp(MODULE_SPECIFIER_PATTERN)` first.
 */
export const MODULE_SPECIFIER_PATTERN =
  /(\bfrom\s+|\bimport\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\2/g;

/**
 * .what = the replacement for a module specifier that ends at a deprecated src dir's barrel
 *         (`'@src/domain'`, `'../../domain'`), or null when the specifier is not such a one.
 * .why  = ONE specifier set for the old-import-paths check AND fix (#655, #671), so the check
 *         cannot pass a bare barrel import the fix would skip. the extant patterns all need a
 *         `/` after the dir, so a bare barrel import matched neither.
 * .note = only the repo's own src dirs count: `@src/<dir>`, or a relative specifier that lands on
 *         exactly `src/<dir>` from the importer's path. a package subpath (`some-pkg/domain`) and
 *         a relative specifier with no importer path to land it from are left alone.
 */
export const asBareDeprecatedDirSpecifierReplacement = (input: {
  specifier: string;
  relativeFilePath: string | null;
}): string | null => {
  // the alias form: '@src/<dir>'
  const aliasDir = input.specifier.match(/^@src\/([^/]+)$/)?.[1];
  if (aliasDir !== undefined) {
    const into = DEPRECATED_DIR_REPLACEMENTS[aliasDir];
    return into ? `@src/${into}` : null;
  }

  // the relative form: lands on exactly 'src/<dir>' from the importer (posix.join collapses `..`)
  if (!input.specifier.startsWith('.') || !input.relativeFilePath) return null;
  const landed = path.posix.join(
    path.posix.dirname(input.relativeFilePath),
    input.specifier,
  );
  const relativeDir = landed.match(/^src\/([^/]+)$/)?.[1];
  if (relativeDir === undefined) return null;
  const into = DEPRECATED_DIR_REPLACEMENTS[relativeDir];
  if (!into) return null;
  return input.specifier.replace(/[^/]+$/, into);
};

/**
 * .what = a file's contents with each bare deprecated-dir barrel specifier repointed.
 */
export const withBareDeprecatedDirSpecifiersRepointed = (input: {
  contents: string;
  relativeFilePath: string | null;
}): string =>
  input.contents.replace(
    MODULE_SPECIFIER_PATTERN,
    (whole, prefix: string, quote: string, specifier: string) => {
      const replacement = asBareDeprecatedDirSpecifierReplacement({
        specifier,
        relativeFilePath: input.relativeFilePath,
      });
      return replacement ? `${prefix}${quote}${replacement}${quote}` : whole;
    },
  );

/**
 * .what = whether a file holds any bare deprecated-dir barrel specifier.
 */
export const hasBareDeprecatedDirSpecifier = (input: {
  contents: string;
  relativeFilePath: string | null;
}): boolean =>
  withBareDeprecatedDirSpecifiersRepointed(input) !== input.contents;
