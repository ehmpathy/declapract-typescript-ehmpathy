// eslint-disable-next-line import/no-extraneous-dependencies
import { FileCheckType, type FileFixFunction } from 'declapract';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents: context.declaredFileContents };

  const declaredContents = context.declaredFileContents ?? '';

  // Parse both files as YAML (using parseDocument to preserve comments)
  const currentDoc = yaml.parseDocument(contents);
  const declaredParsed = yaml.parse(declaredContents) as { ignores?: string[] };

  const currentIgnores =
    (currentDoc.toJSON() as { ignores?: string[] })?.ignores ?? [];
  const declaredIgnores = declaredParsed?.ignores ?? [];

  // Find missing ignores
  const missingIgnores = declaredIgnores.filter(
    (item) => !currentIgnores.includes(item),
  );

  if (missingIgnores.length === 0) return { contents };

  // get the ignores seq node, seeding an empty seq onto the doc if absent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ignoresNode = ((): any => {
    const node = currentDoc.get('ignores');
    if (node) return node;
    currentDoc.set('ignores', []);
    return currentDoc.get('ignores');
  })();

  // .note = deliberate mutation — the yaml document api mutates the seq node in
  // place to preserve the surrounding comments; there is no immutable seq-add
  missingIgnores.forEach((ignore) => ignoresNode.add(ignore));

  return { contents: currentDoc.toString() };
};
