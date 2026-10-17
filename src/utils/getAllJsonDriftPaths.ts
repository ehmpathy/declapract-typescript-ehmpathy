import { isJsonObject, type JsonLeafKeepRule } from './asJsonMergedDeep';

/**
 * .what = list the dotted paths where found json does not contain the declared json
 * .why  = a check that names each drifted leaf tells the human what apply will change; an empty
 *         list means the found json already holds every declared value. the same keep rule as
 *         asJsonMergedDeep, so the check passes on exactly what the merge produces.
 */
export const getAllJsonDriftPaths = (input: {
  declared: unknown;
  found: unknown;
  path: string[];
  isLeafKept: JsonLeafKeepRule;
}): string[] => {
  // a declared object owes each of its keys, recursively
  if (isJsonObject(input.declared)) {
    if (!isJsonObject(input.found)) return [input.path.join('.')];
    const declared = input.declared;
    const found = input.found;
    return Object.keys(declared).flatMap((key) =>
      getAllJsonDriftPaths({
        declared: declared[key],
        found: found[key],
        path: [...input.path, key],
        isLeafKept: input.isLeafKept,
      }),
    );
  }

  // a leaf: equal, or kept by the rule
  const isEqual =
    JSON.stringify(input.declared) === JSON.stringify(input.found);
  if (isEqual) return [];
  const isKept =
    input.found !== undefined &&
    input.isLeafKept({
      path: input.path,
      declared: input.declared,
      found: input.found,
    });
  return isKept ? [] : [input.path.join('.')];
};
