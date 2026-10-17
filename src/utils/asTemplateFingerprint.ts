import ts from 'typescript';

import { createHash } from 'node:crypto';

/**
 * .what = a sha256 fingerprint of a typescript source that ignores format drift
 * .why = a bad-practice may delete a retired template only when the repo's copy is still the
 *        template — an adopter's edit must never be dropped silently. a byte compare would miss
 *        a copy the repo's formatter rewrapped, requoted, or stripped of semicolons; this one
 *        compares the token stream instead, so only a change to the code itself counts as an edit
 * .note = comments and whitespace are dropped; string literals are compared by value, so the
 *         quote style does not count; a `;`, and a `,` right before a closer, are dropped, since a
 *         formatter adds or removes both freely. an import reorder still counts as an edit
 */
export const asTemplateFingerprint = (input: { source: string }): string => {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true, // skip trivia: whitespace and comments
    ts.LanguageVariant.Standard,
    input.source,
  );

  // read every token as its normalized text
  // .note = deliberate mutation: the scanner is a cursor, so the loop pushes as it advances.
  //         a bare scan reads the `}` that closes a `${…}` as a brace and the template text after
  //         it as code, so the brace depth inside each open template is tracked, and that `}` is
  //         rescanned as the template middle or tail it truly is
  const tokens: string[] = [];
  const templateBraceDepths: number[] = [];
  for (
    let kind = scanner.scan();
    kind !== ts.SyntaxKind.EndOfFileToken;
    kind = scanner.scan()
  ) {
    const depthIndex = templateBraceDepths.length - 1;
    if (kind === ts.SyntaxKind.TemplateHead) templateBraceDepths.push(0);
    if (kind === ts.SyntaxKind.OpenBraceToken && depthIndex >= 0)
      templateBraceDepths[depthIndex] =
        (templateBraceDepths[depthIndex] ?? 0) + 1;
    const depth = templateBraceDepths[depthIndex] ?? -1;
    if (kind === ts.SyntaxKind.CloseBraceToken && depth > 0)
      templateBraceDepths[depthIndex] = depth - 1;
    if (kind === ts.SyntaxKind.CloseBraceToken && depth === 0) {
      kind = scanner.reScanTemplateToken(false);
      if (kind === ts.SyntaxKind.TemplateTail) templateBraceDepths.pop();
    }
    if (kind === ts.SyntaxKind.StringLiteral)
      tokens.push(JSON.stringify(scanner.getTokenValue()));
    else tokens.push(scanner.getTokenText());
  }

  // drop the punctuation a formatter adds or removes freely
  const closers = new Set([')', '}', ']', '>']);
  const kept = tokens.filter((token, index) => {
    if (token === ';') return false;
    if (token === ',' && closers.has(tokens[index + 1] ?? '')) return false;
    return true;
  });

  return createHash('sha256').update(kept.join(' ')).digest('hex');
};
