import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { isMap, isScalar, parseDocument } from 'yaml';

import { isVersionBelowFloor } from '../../../../utils/isVersionBelowFloor';

/**
 * .what = the sdk-aws-lambda floor the node-service practice declares (#646)
 * .why  = matches the package.json declaration beside this one; both retire the same keys
 */
const SDK_AWS_LAMBDA_FLOOR = '0.7.2';

/**
 * .what = the `patchedDependencies` keys in a pnpm-workspace.yaml that patch sdk-aws-lambda below the floor
 * .why  = pnpm 10 reads patchedDependencies from the workspace file as well as from package.json;
 *         the `patches/` declaration deletes every below-floor patch file, so a key left here
 *         names a file that is gone, and pnpm refuses the install (#670)
 */
const getAllPatchKeysBelowFloor = (input: { contents: string }): string[] => {
  const patched = parseDocument(input.contents).get('patchedDependencies');
  if (!isMap(patched)) return [];
  return patched.items
    .map((pair) => (isScalar(pair.key) ? String(pair.key.value) : null))
    .filter((key): key is string => key !== null)
    .filter((key) => {
      const found = key.match(/^sdk-aws-lambda@(.+)$/);
      if (!found) return false;
      return isVersionBelowFloor({
        version: found[1]!,
        floor: SDK_AWS_LAMBDA_FLOOR,
      });
    });
};

/**
 * .what = detects a pnpm-workspace.yaml that patches sdk-aws-lambda below the floor
 */
export const check: FileCheckFunction = (contents) => {
  if (contents && getAllPatchKeysBelowFloor({ contents }).length) return; // bad practice detected
  throw new Error('does not match bad practice');
};

/**
 * .what = drops each below-floor sdk-aws-lambda patch key, and the map once it is empty
 * .why  = edits the parsed document in place, so the repo's other keys and comments survive
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const keysBelow = getAllPatchKeysBelowFloor({ contents });
  if (!keysBelow.length) return { contents };

  // drop the stale keys
  const document = parseDocument(contents);
  keysBelow.forEach((key) => document.deleteIn(['patchedDependencies', key]));

  // drop the map once no patch is left in it
  const patched = document.get('patchedDependencies');
  if (isMap(patched) && !patched.items.length)
    document.delete('patchedDependencies');

  return { contents: document.toString() };
};
