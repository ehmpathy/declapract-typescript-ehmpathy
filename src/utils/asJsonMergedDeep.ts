/**
 * .what = a rule that says whether a found json leaf may stand in for the declared one
 * .why  = some leaves accept more than one value (an extant password, a hand-set name); the
 *         merge keeps such a found value, and the drift check accepts it
 */
export type JsonLeafKeepRule = (input: {
  path: string[];
  declared: unknown;
  found: unknown;
}) => boolean;

/**
 * .what = whether a value is a plain json object (never an array or null)
 */
export const isJsonObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * .what = deep-merge declared json into found json: each declared key wins, every found key the
 *         declaration lacks is kept, and a found leaf the keep rule accepts is kept
 * .why  = a shallow `{ ...found, ...declared }` replaces a whole subtree, so a repo's own nested
 *         keys (a hand-set tunnel name, an extra database key) vanish on every apply (#539 7c)
 * .note = key order: found keys first, in found order, then declared keys found lacked. so a
 *         second merge over its own output returns the same bytes (idempotent).
 */
export const asJsonMergedDeep = (input: {
  declared: unknown;
  found: unknown;
  path: string[];
  isLeafKept: JsonLeafKeepRule;
}): unknown => {
  // a declared object merges key by key into a found object
  if (isJsonObject(input.declared) && isJsonObject(input.found)) {
    const declared = input.declared;
    const found = input.found;
    const keys = [
      ...Object.keys(found),
      ...Object.keys(declared).filter((key) => !(key in found)),
    ];
    return Object.fromEntries(
      keys.map((key) => [
        key,
        key in declared
          ? asJsonMergedDeep({
              declared: declared[key],
              found: found[key],
              path: [...input.path, key],
              isLeafKept: input.isLeafKept,
            })
          : found[key],
      ]),
    );
  }

  // a declared object over a non-object takes the declared shape
  if (isJsonObject(input.declared)) return input.declared;

  // a leaf: keep the found value where the rule accepts it, else the declared value
  const isKept =
    input.found !== undefined &&
    input.isLeafKept({
      path: input.path,
      declared: input.declared,
      found: input.found,
    });
  return isKept ? input.found : input.declared;
};
