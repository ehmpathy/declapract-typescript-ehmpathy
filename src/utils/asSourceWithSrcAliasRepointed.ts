/**
 * .what = every quoted `@src/` specifier in a source file, repointed at `@/src/`
 * .why  = `@/` is the one path anchor, so `'@src/domain.operations/x'` reads `'@/src/domain.operations/x'`; the quote kind
 *         is kept, and only a specifier that opens a quoted string is touched, so a `@src/` inside
 *         prose or a longer word stays as written
 * .note = a fixed point: the output holds no `@src/` specifier, so a second call changes naught
 */
export const asSourceWithSrcAliasRepointed = (input: { contents: string }): string =>
  input.contents.replace(/(['"`])@src\//g, '$1@/src/');
