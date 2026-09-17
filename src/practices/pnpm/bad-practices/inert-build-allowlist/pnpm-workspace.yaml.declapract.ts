import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects a `pnpm-workspace.yaml` that carries an `allowBuilds:` block and removes it.
 *         when the block is the file's sole content, the whole file is deleted.
 * .why  = `allowBuilds:` is pnpm v11 syntax; the pnpm practice pins v10 (`pnpm@10.34.5`), where
 *         the build allowlist key is `pnpm.onlyBuiltDependencies` (an ARRAY, in package.json).
 *         so an `allowBuilds:` block under the v10 pin does ZERO work — yet it READS like a live
 *         allowlist, the exact trap #575 / ehmpathy/rhachet#475 burned an hour on.
 * .note = the fix is DELETE, not a boolean-fill and not a fail-loud stub. (1) rhachet retired the
 *         manual allowlist step ("by subtraction"); declapract emits no allowlist to converge to.
 *         (2) a real allowlist is repo-specific (the v10 `pnpm.onlyBuiltDependencies` array the
 *         repo adds itself). an inert block does no work, so its removal cannot regress a build.
 * .note = idempotent — after fix the key is gone, check no longer detects it, re-run is a no-op.
 */
const ALLOW_BUILDS_KEY = /^allowBuilds:/;

/** a yaml child line: whitespace-indented, then non-whitespace (the block's nested entries). */
const isIndentedChild = (line: string): boolean => /^\s+\S/.test(line);

/**
 * strip the `allowBuilds:` key line + its contiguous indented child lines. a pure fold over the
 * lines with an immutable `{ inBlock, kept }` accumulator (no `let`, no in-place push): the key
 * line opens the block (and is dropped), each indented child is dropped while open, and the first
 * non-indented (or blank) line closes the block and is kept. handles more than one block, since a
 * later key line simply re-opens.
 */
const stripAllowBuildsBlock = (contents: string): string =>
  contents
    .split('\n')
    .reduce<{ inBlock: boolean; kept: string[] }>(
      (acc, line) => {
        // the key line opens the block and is itself dropped
        if (ALLOW_BUILDS_KEY.test(line))
          return { inBlock: true, kept: acc.kept };
        // an indented child of an open block is dropped
        if (acc.inBlock && isIndentedChild(line)) return acc;
        // any non-indented (or blank) line closes the block and is kept
        return { inBlock: false, kept: [...acc.kept, line] };
      },
      { inBlock: false, kept: [] },
    )
    .kept.join('\n');

const hasAllowBuilds = (contents: string): boolean =>
  contents.split('\n').some((line) => ALLOW_BUILDS_KEY.test(line));

export const check: FileCheckFunction = (contents) => {
  if (contents === null) throw new Error('does not match bad practice');
  if (!hasAllowBuilds(contents)) throw new Error('does not match bad practice');
  return;
};

export const fix: FileFixFunction = (contents) => {
  if (contents === null) return { contents };
  const stripped = stripAllowBuildsBlock(contents);
  if (stripped.trim() === '') return { contents: null };
  return { contents: stripped };
};
