/**
 * .what = the first `major.minor.patch` triple of a version or range, as numbers.
 * .why  = a package.json value may carry a range operator (`^4.3.6`, `~3.23.8`, `>=1.0.0`); the
 *         floor comparison reads the lowest version the range admits, which is its first triple.
 * .note = null when no numeric version heads the value (`latest`, `workspace:*`, `link:.`) — such a
 *         value cannot be judged against a floor, so the caller must not flag it.
 */
const asVersionTriple = (input: {
  version: string;
}): [number, number, number] | null => {
  const found = input.version.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!found) return null;
  return [Number(found[1]), Number(found[2] ?? 0), Number(found[3] ?? 0)];
};

/**
 * .what = whether a declared version (or range) sits below a floor version.
 * .why  = several fixes raise a dependency only when it undercuts a floor, and keep a higher
 *         adopter choice untouched. one comparator keeps that judgment identical across them.
 * .note = false for a value with no numeric version (it cannot be judged; never flag a guess).
 */
export const isVersionBelowFloor = (input: {
  version: string;
  floor: string;
}): boolean => {
  const version = asVersionTriple({ version: input.version });
  const floor = asVersionTriple({ version: input.floor });
  if (!version || !floor) return false;
  const [delta] = [0, 1, 2]
    .map((index) => version[index]! - floor[index]!)
    .filter((difference) => difference !== 0);
  return (delta ?? 0) < 0;
};
