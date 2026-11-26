/**
 * .what = the first match of `pattern` that sits directly in the `within` body, not in a nested object.
 * .why  = `"compilerOptions"` also appears under `ts-node`, and tsc reads only the top-level one;
 *         a match is a direct child when its body prefix opens as many braces as it closes.
 * .note = `shape` is a `JsoncView.shape`, so no brace inside a string or a comment is counted.
 */
export const getOneJsoncDirectMatch = (input: {
  shape: string;
  pattern: RegExp;
  within: { from: number; until: number };
}): { start: number; match: RegExpMatchArray } | null => {
  const body = input.shape.slice(input.within.from, input.within.until);
  const found = [
    ...body.matchAll(new RegExp(input.pattern.source, 'g')),
  ].find((match) => {
    const prefix = body.slice(0, match.index ?? 0);
    const opens = prefix.split('{').length - 1;
    const closes = prefix.split('}').length - 1;
    return opens === closes;
  });
  if (!found) return null;
  return { start: input.within.from + (found.index ?? 0), match: found };
};
