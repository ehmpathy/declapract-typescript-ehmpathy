/**
 * .what = the deprecated source dirs whose files a peer dir-move bad-practice
 *         RELOCATES (logic-dir, data-dir, domain-dir, model-dir, services-dir,
 *         nonpublished-modules-dir).
 * .why  = a file still under one of these gets MOVED this pass; any in-place
 *         rewrite of that same file (import-path rewrite) must DEFER to the next
 *         pass, when the file sits at its new location. otherwise declapract
 *         applies a relocate AND an in-place rewrite to one file in one apply —
 *         the move unlinks the source, then the rewrite throws ENOENT against it.
 *         one source for both declarers that must defer (mirrors
 *         `defineExpectedGitignoreContents` / `defineExpectedNpmrcContents`), so
 *         the guard cannot drift between them.
 */
export const DEPRECATED_SRC_DIR_PATTERNS: readonly RegExp[] = [
  /\/logic\//,
  /\/data\//,
  /\/domain\//,
  /\/model\//,
  /\/services\//,
  /\/__nonpublished_modules__\//,
];

/**
 * .what = true when a file still sits under a deprecated src dir, so an in-place
 *         rewrite of it must DEFER to the peer dir-move's next pass.
 * .why  = the shared predicate both `old-import-paths` (directory-structure-src)
 *         and `relative-imports` (typescript-any) gate their in-place import
 *         rewrite on — so neither rewrites a file the same apply relocates.
 */
export const isDeferredToDeprecatedDirMove = (input: {
  relativeFilePath: string | undefined;
}): boolean => {
  const relativeFilePath = input.relativeFilePath ?? '';
  return DEPRECATED_SRC_DIR_PATTERNS.some((pattern) =>
    pattern.test(relativeFilePath),
  );
};
