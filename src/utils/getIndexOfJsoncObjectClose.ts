/**
 * .what = the offset of the `}` that closes the object whose body starts at `from`.
 * .why  = bounds an object by its own close, past any nested object inside it.
 * .note = `shape` is a `JsoncView.shape`, so no brace inside a string or a comment is counted;
 *         an unclosed object runs to the end of the text.
 */
export const getIndexOfJsoncObjectClose = (input: {
  shape: string;
  from: number;
}): number => {
  const braces = [...input.shape.slice(input.from).matchAll(/[{}]/g)];
  const close = braces.reduce<{ depth: number; at: number | null }>(
    (found, brace) => {
      if (found.at !== null) return found;
      const depth = found.depth + (brace[0] === '{' ? 1 : -1);
      return {
        depth,
        at: depth === 0 ? input.from + (brace.index ?? 0) : null,
      };
    },
    { depth: 1, at: null },
  );
  return close.at ?? input.shape.length;
};
