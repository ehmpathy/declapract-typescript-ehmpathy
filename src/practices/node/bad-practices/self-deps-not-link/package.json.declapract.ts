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

  const badSelfDeps: { depKey: string; version: string }[] = [];

  for (const depKey of DEP_KEYS) {
    const deps = packageJson[depKey] as Record<string, string> | undefined;
    if (!deps) continue;

    const selfDepVersion = deps[packageName];
    if (selfDepVersion && selfDepVersion !== 'link:.') {
      badSelfDeps.push({ depKey, version: selfDepVersion });
    }
  }

  return badSelfDeps;
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

  let modified = false;

  for (const depKey of DEP_KEYS) {
    const deps = packageJson[depKey] as Record<string, string> | undefined;
    if (!deps) continue;

    const selfDepVersion = deps[packageName];
    if (selfDepVersion && selfDepVersion !== 'link:.') {
      delete deps[packageName];
      modified = true;

      // if deps object is now empty, remove it
      if (Object.keys(deps).length === 0) {
        delete packageJson[depKey];
      }
    }
  }

  if (!modified) return { contents };

  return {
    contents: JSON.stringify(packageJson, null, 2),
  };
};
