import type { FileCheckFunction, FileFixFunction } from 'declapract';

const DEP_KEYS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

/**
 * .what = finds self-dependencies that are not `link:.`
 */
const findBadSelfDeps = (
  packageJson: Record<string, unknown>,
): { depKey: string; version: string }[] => {
  const packageName = packageJson.name as string | undefined;
  if (!packageName) return [];

  return DEP_KEYS.flatMap((depKey) => {
    const deps = packageJson[depKey] as Record<string, string> | undefined;
    const selfDepVersion = deps?.[packageName];
    if (selfDepVersion && selfDepVersion !== 'link:.')
      return [{ depKey, version: selfDepVersion }];
    return [];
  });
};

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('no package.json found');

  const packageJson = JSON.parse(contents);
  const badSelfDeps = findBadSelfDeps(packageJson);

  // bad practice semantics: return = detected, throw = not detected
  if (badSelfDeps.length > 0) return;

  throw new Error('no bad self-dependencies found');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJson = JSON.parse(contents);
  const packageName = packageJson.name as string | undefined;
  if (!packageName) return { contents };

  const badSelfDeps = findBadSelfDeps(packageJson);
  if (badSelfDeps.length === 0) return { contents };

  const badDepKeys = new Set(badSelfDeps.map((dep) => dep.depKey));

  // rebuild the manifest without the self-deps; drop any dep object left empty
  const cleaned = Object.fromEntries(
    Object.entries(packageJson).flatMap(([key, value]) => {
      if (!badDepKeys.has(key)) return [[key, value]];

      const { [packageName]: _selfDep, ...rest } = value as Record<
        string,
        string
      >;
      if (Object.keys(rest).length === 0) return [];
      return [[key, rest]];
    }),
  );

  return {
    contents: JSON.stringify(cleaned, null, 2),
  };
};
