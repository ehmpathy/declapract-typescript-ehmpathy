import { getOneSourceScanEnd } from './getOneSourceScanEnd';

/**
 * .what = rewrite every `<callee>(…)` call through a per-call transform of its argument text
 * .why  = a codemod that moves a call onto a successor whose shape differs by more than a name
 *         must read each call's argument list whole (strings and nested brackets skipped by the
 *         scanner) and rebuild it. one source for every declaration that does so.
 * .note = the rewrite emits its call relative to column 0; each later line is re-indented to the
 *         line the call starts on, and the args it reads are de-indented by the same amount, so a
 *         multi-line value keeps its own shape. the rewrite must not emit `<callee>(` again, or
 *         the walk would not end.
 */
export const withEachCallRewritten = (input: {
  contents: string;
  callee: string;
  rewrite: (args: { argsText: string }) => string;
}): string => {
  const found = new RegExp(
    `(?<![.\\w$])${input.callee.replace(/[.$]/g, '\\$&')}\\s*\\(`,
  ).exec(input.contents);
  if (!found) return input.contents;
  const parenOpen = found.index + found[0].length - 1;
  const parenClose = getOneSourceScanEnd({
    contents: input.contents,
    from: parenOpen,
    mode: 'close',
  });

  // the new call's later lines sit at the indent of the line the call starts on
  const lineStart = input.contents.lastIndexOf('\n', found.index) + 1;
  const indent = input.contents.slice(lineStart).match(/^[ \t]*/)?.[0] ?? '';

  // the args are read relative to that indent, so a multi-line value keeps its own shape
  const argsText = input.contents
    .slice(parenOpen + 1, parenClose)
    .split('\n')
    .map((line, index) =>
      index > 0 && line.startsWith(indent) ? line.slice(indent.length) : line,
    )
    .join('\n');
  const callText = input
    .rewrite({ argsText })
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${indent}${line}`))
    .join('\n');

  // splice the call in, then walk on to the next
  const rewritten =
    input.contents.slice(0, found.index) +
    callText +
    input.contents.slice(parenClose + 1);
  return withEachCallRewritten({ ...input, contents: rewritten });
};
