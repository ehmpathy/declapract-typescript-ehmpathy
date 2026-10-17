import type { FileCheckFunction, FileFixFunction } from 'declapract';

import path from 'node:path';
import { getAllStalePatchKeys } from '../../../../../utils/getAllStalePatchKeys';
import { getFileTextOrNull } from '../../../../../utils/getFileTextOrNull';

/**
 * .what = the `pnpm.patchedDependencies` key a patch file stands for, from its path
 * .why  = pnpm names a patch `<name>@<version>.patch`, with a scope slash encoded as `__`
 */
const asPatchKey = (input: { relativeFilePath: string }): string =>
  path
    .basename(input.relativeFilePath)
    .replace(/\.patch$/, '')
    .replace(/^(@[^_]+)__/, '$1/');

/**
 * .what = detects a patch file whose pinned version the lockfile no longer resolves (#680)
 * .why  = the patch applies to no install; its key is retired by the package.json declaration
 *         beside this one, and the file goes with it
 * .note = bad-practice semantics: a RETURN means detected, a THROW means not detected
 */
export const check: FileCheckFunction = (contents, context) => {
  if (contents === null) throw new Error('does not match bad practice');
  const lockfile = getFileTextOrNull({
    root: context.getProjectRootDirectory(),
    relativePath: 'pnpm-lock.yaml',
  });
  const key = asPatchKey({ relativeFilePath: context.relativeFilePath });
  const keysStale = getAllStalePatchKeys({
    patchedDependencies: { [key]: context.relativeFilePath },
    lockfile,
  });
  if (keysStale.length) return; // bad practice detected
  throw new Error('does not match bad practice');
};

/**
 * .what = deletes the stale patch file
 */
export const fix: FileFixFunction = () => ({ contents: null });
