import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';
import { getAllStalePatchKeys } from '../../../../utils/getAllStalePatchKeys';
import { getFileTextOrNull } from '../../../../utils/getFileTextOrNull';

const PRACTICE = 'pnpm/stale-patched-dependency';

/**
 * .what = the repo's pnpm lockfile, or null when it has none
 */
const getLockfile = (input: { root: string }): string | null =>
  getFileTextOrNull({ root: input.root, relativePath: 'pnpm-lock.yaml' });

/**
 * .what = detects a package.json whose `pnpm.patchedDependencies` pins a version the lockfile no
 *         longer resolves (#680)
 * .why  = such a patch applies to no install: pnpm warns on it (under `allowUnusedPatches`) or
 *         refuses the install (without it). the patch is dead weight a human must retire by hand
 * .note = bad-practice semantics: a RETURN means detected, a THROW means not detected
 */
export const check: FileCheckFunction = (contents, context) => {
  if (!contents) throw new Error('does not match bad practice');
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const keys = getAllStalePatchKeys({
    patchedDependencies: packageJSON.pnpm?.patchedDependencies ?? {},
    lockfile: getLockfile({ root: context.getProjectRootDirectory() }),
  });
  if (keys.length) return; // bad practice detected
  throw new Error('does not match bad practice');
};

/**
 * .what = drops each stale patch key, and an empty map or pnpm block left behind
 * .why  = the patch file itself is deleted by the `patches/` declaration beside this one
 * .note = a fixed point: once the stale keys are gone, the check no longer detects the pattern
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return {};
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const patchedDependencies: Record<string, string> =
    packageJSON.pnpm?.patchedDependencies ?? {};
  const keysStale = getAllStalePatchKeys({
    patchedDependencies,
    lockfile: getLockfile({ root: context.getProjectRootDirectory() }),
  });
  if (!keysStale.length) return { contents };

  // the map without the stale keys
  const patchedKept = Object.fromEntries(
    Object.entries(patchedDependencies).filter(
      ([key]) => !keysStale.includes(key),
    ),
  );

  // an empty map is dropped, and so is an empty pnpm block
  const pnpmKept = {
    ...packageJSON.pnpm,
    patchedDependencies: Object.keys(patchedKept).length
      ? patchedKept
      : undefined,
  };
  const pnpmHasKeys = Object.values(pnpmKept).some(
    (value) => value !== undefined,
  );

  return {
    contents: `${JSON.stringify(
      { ...packageJSON, pnpm: pnpmHasKeys ? pnpmKept : undefined },
      null,
      2,
    )}\n`,
  };
};
