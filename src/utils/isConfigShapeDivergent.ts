import flatten from 'flat';

/**
 * .what = the flattened leaf keys of a config object, and those whose value is null
 */
const asConfigLeaves = (input: {
  config: object;
}): { keys: string[]; nullKeys: string[] } => {
  const flat: Record<string, unknown> = flatten(input.config);
  const keys = Object.keys(flat);
  return { keys, nullKeys: keys.filter((key) => flat[key] === null) };
};

/**
 * .what = whether a leaf of one config is matched in a peer config
 * .why  = an env with no such resource declares it `null` (e.g. test has no lambda tunnel:
 *         `"lambda": null`), while a peer env declares the object (`{ host, port }`). that is one
 *         shape, so a null leaf `x` and a peer subtree `x.*` match each other, in each direction
 */
const isLeafMatched = (input: {
  key: string;
  isNull: boolean;
  peer: { keys: string[]; nullKeys: string[] };
}): boolean =>
  input.peer.keys.includes(input.key) ||
  input.peer.nullKeys.some((nullKey) => input.key.startsWith(`${nullKey}.`)) ||
  (input.isNull &&
    input.peer.keys.some((key) => key.startsWith(`${input.key}.`)));

/**
 * .what = whether every leaf of one config is matched in a peer config
 */
const isEveryLeafMatched = (input: {
  leaves: { keys: string[]; nullKeys: string[] };
  peer: { keys: string[]; nullKeys: string[] };
}): boolean =>
  input.leaves.keys.every((key) =>
    isLeafMatched({
      key,
      isNull: input.leaves.nullKeys.includes(key),
      peer: input.peer,
    }),
  );

/**
 * .what = whether two env configs declare different shapes
 * .why  = every env config must declare the same keys as config/test.json, so a key added to one
 *         env is never absent at runtime in another. a null leaf is an absent subtree, which
 *         matches the peer's subtree (see isLeafMatched)
 */
export const isConfigShapeDivergent = (input: {
  expected: object;
  found: object;
}): boolean => {
  const expected = asConfigLeaves({ config: input.expected });
  const found = asConfigLeaves({ config: input.found });
  return (
    !isEveryLeafMatched({ leaves: expected, peer: found }) ||
    !isEveryLeafMatched({ leaves: found, peer: expected })
  );
};
