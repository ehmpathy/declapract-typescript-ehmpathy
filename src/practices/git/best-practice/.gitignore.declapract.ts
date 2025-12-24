import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { dedupe } from 'domain-objects';
import expect from 'expect';

const expectedIgnores = [
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
  'node_modules',
].sort();

const defineExpectedContents = (contents: string | null): string => {
  const ignoresAlreadyDefined = contents ? contents.split('\n') : [];
  const finalLines = dedupe([...ignoresAlreadyDefined, ...expectedIgnores])
    .sort() // sorted
    .filter((line) => !!line); // without empty lines
  return [...finalLines.sort(), ''].join('\n');
};

export const check: FileCheckFunction = (contents) => {
  expect(contents).toEqual(defineExpectedContents(contents));
};

export const fix: FileFixFunction = (contents) => {
  return { contents: defineExpectedContents(contents) };
};
