// eslint-disable-next-line import/no-extraneous-dependencies
import { FileCheckType, FileFixFunction } from 'declapract';
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

  // Add missing ignores to the document (preserves comments)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ignoresNode = currentDoc.get('ignores') as any;
  if (!ignoresNode) {
    currentDoc.set('ignores', []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ignoresNode = currentDoc.get('ignores') as any;
  }
  for (const ignore of missingIgnores) {
    ignoresNode.add(ignore);
  }

  return { contents: currentDoc.toString() };
};
