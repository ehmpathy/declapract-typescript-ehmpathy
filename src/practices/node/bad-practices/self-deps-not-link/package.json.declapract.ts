import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { isJsonObject } from '../../../../utils/asJsonMergedDeep';
import { asPackageJSON } from '../../../../utils/asPackageJSON';

const DEP_KEYS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

const PRACTICE = 'node/self-deps-not-link';

/**
 * .what = the package's own name, or null where package.json names none
 * .why  = a self-dep is keyed by this name; a non-string `name` names no package to match
 */
const getOnePackageName = (input: {
  packageJson: Record<string, unknown>;
}): string | null =>
  typeof input.packageJson.name === 'string' ? input.packageJson.name : null;

/**
 * .what = finds self-dependencies that are not `link:.`
 * .why  = check and fix read one list, so the flag and the repair agree on which deps are bad
 */
const findBadSelfDeps = (
  packageJson: Record<string, unknown>,
): { depKey: string; version: string }[] => {
  const packageName = getOnePackageName({ packageJson });
  if (!packageName) return [];

  return DEP_KEYS.flatMap((depKey) => {
    const deps = packageJson[depKey];
    const selfDepVersion = isJsonObject(deps) ? deps[packageName] : undefined;
    if (typeof selfDepVersion === 'string' && selfDepVersion !== 'link:.')
      return [{ depKey, version: selfDepVersion }];
    return [];
  });
};

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('no package.json found');

  const packageJson = asPackageJSON({ contents }, { practice: PRACTICE });
  const badSelfDeps = findBadSelfDeps(packageJson);

  // bad practice semantics: return = detected, throw = not detected
  if (badSelfDeps.length > 0) return;

  throw new Error('no bad self-dependencies found');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJson = asPackageJSON({ contents }, { practice: PRACTICE });
  const packageName = getOnePackageName({ packageJson });
  if (!packageName) return { contents };

  const badSelfDeps = findBadSelfDeps(packageJson);
  if (badSelfDeps.length === 0) return { contents };

  const badDepKeys = new Set(badSelfDeps.map((dep) => dep.depKey));

  // rebuild the manifest without the self-deps; drop any dep object left empty
  const cleaned = Object.fromEntries(
    Object.entries(packageJson).flatMap(([key, value]) => {
      if (!badDepKeys.has(key) || !isJsonObject(value)) return [[key, value]];

      const { [packageName]: _selfDep, ...rest } = value;
      if (Object.keys(rest).length === 0) return [];
      return [[key, rest]];
    }),
  );

  return {
    contents: JSON.stringify(cleaned, null, 2),
  };
};
