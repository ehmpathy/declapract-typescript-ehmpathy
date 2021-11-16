import { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';
import uniq from 'lodash.uniq';

const expectedIgnores = [
  '.artifact', // deployment artifacts from `simple-artifact-builder` are produced here
  '.env',
  '.serverless',
  '.terraform',
  '.terraform.lock',
  'coverage',
  'dist',
  'node_modules',
].sort();

const defineExpectedContents = (contents: string | null): string => {
  const ignoresAlreadyDefined = contents ? contents.split('\n') : [];
  const finalLines = uniq([...ignoresAlreadyDefined, ...expectedIgnores]) // union of the ones we want plus the ones they defined
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
