import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { dedupe } from 'domain-objects';
import expect from 'expect';

/**
 * ignores that can be sorted alphabetically (no order dependencies)
 */
const ignoresSortable = [
  '*.log',
  '*.tsbuildinfo',
  '.artifact', // deployment artifacts from `simple-artifact-builder` are produced here
  '.env',
  '.serverless',
  '.terraform',
  '.terraform.lock',
  '.yalc',
  '.temp',
  '.vscode',
  '*.local.json', // e.g., .claude/permission.attempts.local.json
  '*.bak.*', // backup files
  'coverage',
  'dist',
].sort();

/**
 * ignores that must appear in a specific order (negations must follow their targets)
 *
 * note
 * - node_modules under .test* dirs are test fixtures (cloned repos via genTempDir)
 * - gitignore negation requires the negated pattern to come after the original
 */
const ignoresOrdered = [
  'node_modules',
  '!.test*/**/node_modules',
  '!.test*/**/node_modules/**',
];

const defineExpectedContents = (contents: string | null): string => {
  // parse ignores from file
  const ignoresFromFile = contents ? contents.split('\n') : [];

  // separate into sortable vs ordered
  const orderedPatterns = new Set(ignoresOrdered);
  const ignoresFromFileSortable = ignoresFromFile.filter(
    (line) => !!line && !orderedPatterns.has(line),
  );

  // combine and sort the sortable ignores
  const sortedIgnores = dedupe([...ignoresFromFileSortable, ...ignoresSortable])
    .sort()
    .filter((line) => !!line);

  // append ordered ignores at the end (order preserved)
  return [...sortedIgnores, ...ignoresOrdered, ''].join('\n');
};

export const check: FileCheckFunction = (contents) => {
  expect(contents).toEqual(defineExpectedContents(contents));
};

export const fix: FileFixFunction = (contents) => {
  return { contents: defineExpectedContents(contents) };
};
