import { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';
import yaml from 'yaml';

const denylist = [
  'date-fns',
  'procedure-fns',
  'ts-node',
  'ts-jest',
  'core-js',
  'babel-jest',
  '@trivago/prettier-plugin-sort-imports',
  '@tsconfig/node-lts-strictest',
];

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('no file found'); // no file = not bad practice

  const parsed = yaml.parse(contents) as { ignores?: string[] };
  const currentIgnores = parsed?.ignores ?? [];

  // Find denylisted ignores that are present
  const denylistedPresent = currentIgnores.filter((item) =>
    denylist.includes(item),
  );

  // Bad practice: throw if no denylisted items found (all is fine), return if denylisted items exist
  if (denylistedPresent.length === 0) {
    throw new Error('no denylisted packages found in ignores');
  }
  // Return (don't throw) = bad practice detected
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  // Parse using parseDocument to preserve comments
  const doc = yaml.parseDocument(contents);
  const parsed = doc.toJSON() as { ignores?: string[] };
  const currentIgnores = parsed?.ignores ?? [];

  // Find denylisted ignores that are present
  const denylistedPresent = currentIgnores.filter((item) =>
    denylist.includes(item),
  );

  if (denylistedPresent.length === 0) return { contents };

  // Remove denylisted ignores from the document
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ignoresNode = doc.get('ignores') as any;
  if (ignoresNode?.items) {
    // Filter out denylisted items
    ignoresNode.items = ignoresNode.items.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => !denylist.includes(item.value ?? item),
    );
  }

  return { contents: doc.toString() };
};
