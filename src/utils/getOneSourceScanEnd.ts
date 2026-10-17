/**
 * .what = the index where a scan of typescript source stops, with strings and comments skipped:
 *         - `close` mode: `from` sits on an opener (`(`, `[`, `{`); the index of its match
 *         - `expression` mode: the index of the first `,` or `;` at depth 0, or of the closer
 *           that would drop below depth 0 (the end of the outer list), else the source end
 * .why  = a codemod that restructures a call or renames an identifier inside an arrow body must
 *         know where that call or body ends. a regex cannot count brackets, and a bracket inside
 *         a string or a comment must not count either.
 * .note = deliberate mutation: a char-by-char scanner holds its cursor + depth as local state.
 *         a functional fold was declined: a per-char recursion would overflow the stack on a large
 *         file, and a reduce cannot jump the cursor past a string or comment it skips.
 *         a template literal is skipped whole, `${…}` holes included (their brackets balance).
 */
export const getOneSourceScanEnd = (input: {
  contents: string;
  from: number;
  mode: 'close' | 'expression';
}): number => {
  const { contents } = input;
  let depth = 0;
  let index = input.from;
  while (index < contents.length) {
    const char = contents[index]!;
    const next = contents[index + 1];

    // skip a line comment
    if (char === '/' && next === '/') {
      const newline = contents.indexOf('\n', index);
      index = newline === -1 ? contents.length : newline;
      continue;
    }

    // skip a block comment
    if (char === '/' && next === '*') {
      const close = contents.indexOf('*/', index + 2);
      index = close === -1 ? contents.length : close + 2;
      continue;
    }

    // skip a string literal, escapes honored
    if (char === "'" || char === '"' || char === '`') {
      index = getOneStringEnd({ contents, from: index }) + 1;
      continue;
    }

    // descend into a bracket
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      index += 1;
      continue;
    }

    // ascend out of a bracket
    if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      if (input.mode === 'close' && depth === 0) return index;
      if (input.mode === 'expression' && depth < 0) return index;
      index += 1;
      continue;
    }

    // a list separator at depth 0 ends an expression
    if (
      input.mode === 'expression' &&
      depth === 0 &&
      (char === ',' || char === ';')
    )
      return index;

    index += 1;
  }
  return contents.length;
};

/**
 * .what = the index of the quote that closes the string literal opened at `from`
 * .why  = names the string skip, so the scanner above reads as one walk. a template literal's
 *         `${…}` hole may itself hold a string or a backtick, so the hole is scanned in `close`
 *         mode rather than searched for the next `}`.
 */
const getOneStringEnd = (input: { contents: string; from: number }): number => {
  const { contents } = input;
  const quote = contents[input.from]!;
  let index = input.from + 1;
  while (index < contents.length) {
    const char = contents[index]!;
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === quote) return index;
    if (quote === '`' && char === '$' && contents[index + 1] === '{') {
      index =
        getOneSourceScanEnd({ contents, from: index + 1, mode: 'close' }) + 1;
      continue;
    }
    index += 1;
  }
  return contents.length;
};
