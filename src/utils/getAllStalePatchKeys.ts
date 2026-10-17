import { getAllVersionsByPackageFromLockfile } from './getAllVersionsByPackageFromLockfile';

/**
 * .what = cast a `pnpm.patchedDependencies` key (or a patch file name) into its package + version
 * .why  = a key reads `name@version` (scoped: `@scope/name@version`); a patch file name encodes the
 *         scope slash as `__` (`@scope__name@version.patch`). a bare `name` key patches every
 *         version, so it has no pinned version
 */
export const asPatchTarget = (input: {
  key: string;
}): { name: string; version: string | null } => {
  const at = input.key.lastIndexOf('@');
  if (at <= 0) return { name: input.key, version: null };
  return { name: input.key.slice(0, at), version: input.key.slice(at + 1) };
};

/**
 * .what = whether a patch version is an exact semver (not a range)
 * .why  = only an exact pin can go stale against the lockfile; a range patch keeps its own match
 */
const isExactVersion = (version: string): boolean =>
  /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version);

/**
 * .what = the `pnpm.patchedDependencies` keys whose pinned version no longer resolves (#680)
 * .why  = a patch pins one exact version; once the lockfile resolves the package to another
 *         version (or drops it), the patch applies to no install. such a patch is dead weight
 *         that pnpm warns on (or, without `allowUnusedPatches`, refuses the install over)
 * .note = no lockfile → no verdict (an empty list): the resolved graph is unknown, so no patch is
 *         judged stale. a range key or a bare name key is never judged stale
 */
export const getAllStalePatchKeys = (input: {
  patchedDependencies: Record<string, string>;
  lockfile: string | null;
}): string[] => {
  if (input.lockfile === null) return [];
  const versionsByName = getAllVersionsByPackageFromLockfile({
    lockfile: input.lockfile,
  });
  return Object.keys(input.patchedDependencies).filter((key) => {
    const target = asPatchTarget({ key });
    if (target.version === null || !isExactVersion(target.version)) return false;
    return !(versionsByName.get(target.name) ?? []).includes(target.version);
  });
};
