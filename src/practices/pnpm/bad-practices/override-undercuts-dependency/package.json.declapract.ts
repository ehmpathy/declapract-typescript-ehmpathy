import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';
import { isVersionBelowFloor } from '../../../../utils/isVersionBelowFloor';

const PRACTICE = 'pnpm/override-undercuts-dependency';

/**
 * .what = each `pnpm.overrides` key whose version sits below the version the repo itself declares
 *         for that package, paired with the declared version it must rise to.
 * .why  = pnpm installs the override, never the dependency it shadows. a floor check reads the
 *         dependency, so an override below it reads green while the tree runs the lower copy
 *         (#624). an override is usually added to settle a contention by someone with no floor in
 *         mind, so the louder its reason, the quieter the loss.
 * .note = only a plain package-name key is judged; a selector key (`foo@1>bar`) or a non-numeric
 *         value (`$foo`, `-`, `link:…`) cannot be compared, so it is never flagged.
 */
const getUndercutOverrides = (input: {
  packageJSON: Record<string, any>;
}): Array<{ name: string; declared: string }> => {
  const overrides: Record<string, unknown> =
    input.packageJSON.pnpm?.overrides ?? {};
  const declaredOf = (name: string): string | undefined =>
    input.packageJSON.dependencies?.[name] ??
    input.packageJSON.devDependencies?.[name];
  return Object.entries(overrides).flatMap(([name, override]) => {
    const declared = declaredOf(name);
    if (typeof override !== 'string' || !declared) return [];
    return isVersionBelowFloor({ version: override, floor: declared })
      ? [{ name, declared }]
      : [];
  });
};

export const check: FileCheckFunction = (contents) => {
  if (!contents)
    throw new Error('does not match bad practice: package.json absent');
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  if (getUndercutOverrides({ packageJSON }).length > 0) return; // bad practice detected
  throw new Error(
    'does not match bad practice: no pnpm.overrides entry sits below its declared dependency',
  );
};

/**
 * .what = raise each undercut override to the version the repo declares for that package.
 * .why  = so the version a floor check reads is the version pnpm installs. every other override
 *         and key is kept as-is.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const raised = Object.fromEntries(
    getUndercutOverrides({ packageJSON }).map(({ name, declared }) => [
      name,
      declared,
    ]),
  );
  const updated = {
    ...packageJSON,
    pnpm: {
      ...packageJSON.pnpm,
      overrides: { ...packageJSON.pnpm?.overrides, ...raised },
    },
  };
  return { contents: JSON.stringify(updated, null, 2) };
};
