import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';
import { isVersionBelowFloor } from '../../../../utils/isVersionBelowFloor';

const PRACTICE = 'node-service/sdk-aws-lambda-pre-v07';

/**
 * .what = the sdk-aws-lambda floor the node-service practice declares (#646)
 * .why  = a patch keyed below the floor patches a release the repo no longer installs; pnpm then
 *         refuses the install, since the patch names a version absent from the lockfile (#670)
 */
const SDK_AWS_LAMBDA_FLOOR = '0.7.2';

/**
 * .what = the `pnpm.patchedDependencies` keys that patch sdk-aws-lambda below the floor
 * .why  = a patch at or above the floor is the consumer's own choice and stays untouched
 */
const getAllPatchKeysBelowFloor = (input: {
  patchedDependencies: Record<string, string> | undefined;
}): string[] =>
  Object.keys(input.patchedDependencies ?? {}).filter((key) => {
    const found = key.match(/^sdk-aws-lambda@(.+)$/);
    if (!found) return false;
    return isVersionBelowFloor({
      version: found[1]!,
      floor: SDK_AWS_LAMBDA_FLOOR,
    });
  });

/**
 * .what = detects a package.json that patches sdk-aws-lambda below the floor
 * .why  = once the floor lands, that patch targets a version no longer installed (#670)
 */
export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('does not match bad practice');
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const keys = getAllPatchKeysBelowFloor({
    patchedDependencies: packageJSON.pnpm?.patchedDependencies,
  });
  if (keys.length) return; // bad practice detected
  throw new Error('does not match bad practice');
};

/**
 * .what = drops each sdk-aws-lambda patch key below the floor, and an empty map left behind
 * .why  = the patch file itself is deleted by the `patches/` declaration beside this one
 * .note = an absent file is left absent: every fix must settle on absent input, a contract the
 *         repo-wide fix-coverage sweep holds (`practiceFixCoverage`, #607)
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const patchedDependencies: Record<string, string> | undefined =
    packageJSON.pnpm?.patchedDependencies;
  const keysBelow = getAllPatchKeysBelowFloor({ patchedDependencies });
  if (!keysBelow.length) return { contents };

  // the map without the stale keys
  const patchedKept = Object.fromEntries(
    Object.entries(patchedDependencies ?? {}).filter(
      ([key]) => !keysBelow.includes(key),
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
