/**
 * .what = whether a source file still names a module through the retired `@src/` alias
 * .why  = `@/` is the one path anchor (`@/src/...`); a quoted `@src/` specifier in an import,
 *         export, `require`, or `jest.mock` no longer resolves once the `@src/*` paths key leaves
 */
export const isSourceWithSrcAliasKept = (input: { contents: string }): boolean =>
  /(['"`])@src\//.test(input.contents);
