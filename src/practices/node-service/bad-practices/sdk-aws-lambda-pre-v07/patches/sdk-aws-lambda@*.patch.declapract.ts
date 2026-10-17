import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { isVersionBelowFloor } from '../../../../../utils/isVersionBelowFloor';

/**
 * .what = the version a `patches/sdk-aws-lambda@<version>.patch` file targets, from its path
 * .why  = pnpm names a patch by the exact version it patches, so the path alone says which
 */
const asPatchVersion = (input: { relativeFilePath: string }): string | null =>
  input.relativeFilePath.match(/sdk-aws-lambda@(.+)\.patch$/)?.[1] ?? null;

/**
 * .what = detects a sdk-aws-lambda patch below the node-service floor, 0.7.2 (#670)
 * .why  = a patch below the floor backports fixes the floor ships; once the floor lands it names a
 *         version the lockfile no longer holds, so pnpm refuses the install
 */
export const check: FileCheckFunction = (contents, context) => {
  if (contents === null) throw new Error('does not match bad practice');
  const version = asPatchVersion({
    relativeFilePath: context.relativeFilePath,
  });
  if (version && isVersionBelowFloor({ version, floor: '0.7.2' })) return; // bad practice detected
  throw new Error('does not match bad practice');
};

/**
 * .what = deletes the stale patch file
 * .why  = its `pnpm.patchedDependencies` key is dropped by the package.json declaration beside it
 */
export const fix: FileFixFunction = () => ({ contents: null });
