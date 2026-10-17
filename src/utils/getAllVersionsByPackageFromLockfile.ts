/**
 * .what = every resolved version of every package in a pnpm lockfile's graph
 * .why  = one parse of the `packages:` keys serves two readers: the hoist flip notice (#610)
 *         lists the names with two or more versions; the stale-patch bad practice (#680) asks
 *         whether a patch's pinned version still resolves
 * .note = pure: reads only the `packages:` keys. supports lockfile v9 (`name@ver:`),
 *         v6 (`/name@ver(peer):`), and v5 (`/name/ver_peer:`)
 */
export const getAllVersionsByPackageFromLockfile = (input: {
  lockfile: string;
}): Map<string, string[]> => {
  // collect the keys of the top-level `packages:` section
  const lines = input.lockfile.split(/\r?\n/);
  const start = lines.findIndex((line) => line === 'packages:');
  if (start === -1) return new Map();
  const after = lines.slice(start + 1);
  const end = after.findIndex((line) => /^[^\s#]/.test(line));
  const section = end === -1 ? after : after.slice(0, end);
  const keys = section
    .filter((line) => /^ {2}[^\s]/.test(line))
    .map((line) => line.trim().replace(/:(\s.*)?$/, ''));

  // map each key to its name + version
  const pairs = keys
    .map((key) => asLockfilePackageNameAndVersion({ key }))
    .filter((pair): pair is { name: string; version: string } => pair !== null);

  // group versions by name, sorted, deduped
  const versionsByName = pairs.reduce<Map<string, Set<string>>>(
    (acc, pair) =>
      new Map(acc).set(
        pair.name,
        new Set([...(acc.get(pair.name) ?? []), pair.version]),
      ),
    new Map(),
  );
  return new Map(
    [...versionsByName.entries()].map(([name, versions]) => [
      name,
      [...versions].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
    ]),
  );
};

/**
 * .what = cast one lockfile `packages:` key into its package name + version
 * .why  = the key shape differs per lockfile version; one cast keeps the reader flat
 */
const asLockfilePackageNameAndVersion = (input: {
  key: string;
}): { name: string; version: string } | null => {
  // strip quotes, the v5/v6 lead slash, and any peer suffix
  const bare = input.key
    .replace(/^['"]|['"]$/g, '')
    .replace(/^\//, '')
    .replace(/\(.*$/, '');

  // v6 / v9: name@version (a scoped name starts with @, so look past index 0)
  const at = bare.lastIndexOf('@');
  if (at > 0) return { name: bare.slice(0, at), version: bare.slice(at + 1) };

  // v5: name/version_peer
  const slash = bare.lastIndexOf('/');
  if (slash > 0)
    return {
      name: bare.slice(0, slash),
      version: bare.slice(slash + 1).replace(/_.*$/, ''),
    };

  return null;
};
