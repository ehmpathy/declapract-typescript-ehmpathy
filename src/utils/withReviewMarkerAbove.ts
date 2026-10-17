/**
 * .what = insert a `// @declapract:review: …` line directly above each line that matches, once.
 * .why  = a fix that cannot safely rewrite a line (a shape move, a contract change, a design call)
 *         must still leave the tree pointed at the move, never silent and never half-migrated. the
 *         marker lands beside the line tsc or a reviewer will name, so the instruction sits in the
 *         file rather than in a readme no `plan` output prints. ONE source for every declaration
 *         that stamps a line-scoped marker, so the idempotency guard cannot drift between them.
 * .note = idempotent: the contiguous `//` comment block above a matched line is scanned, and a line
 *         whose block already holds this exact marker is left alone. so a re-apply is a no-op.
 * .note = `lineMatcher` may carry any flags; a global flag is stripped from a private copy, so the
 *         caller's regex is never mutated and no `lastIndex` state leaks between lines.
 */
export const withReviewMarkerAbove = (input: {
  contents: string;
  lineMatcher: RegExp;
  marker: string;
}): string => {
  // a per-line test must not carry `lastIndex` state between lines, so drop any global flag
  const matcher = new RegExp(
    input.lineMatcher.source,
    input.lineMatcher.flags.replace('g', ''),
  );
  const lines = input.contents.split('\n');

  // scan the contiguous `//` comment block above a line for this exact marker
  const isMarkedAbove = (index: number): boolean => {
    const prior = lines[index - 1];
    if (prior === undefined) return false;
    if (!prior.trimStart().startsWith('//')) return false;
    if (prior.includes(input.marker)) return true;
    return isMarkedAbove(index - 1);
  };

  // stamp each matched line that does not yet carry the marker, at the line's own indent
  return lines
    .flatMap((line, index) => {
      if (!matcher.test(line)) return [line];
      if (isMarkedAbove(index)) return [line];
      const indent = line.match(/^[ \t]*/)?.[0] ?? '';
      return [`${indent}${input.marker}`, line];
    })
    .join('\n');
};
