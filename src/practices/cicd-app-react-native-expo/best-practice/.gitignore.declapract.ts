import { FileCheckFunction, FileFixFunction } from 'declapract';
import { dedupe } from 'domain-objects';
import expect from 'expect';

const expectedIgnores = ['android/', 'ios/'].sort();

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
