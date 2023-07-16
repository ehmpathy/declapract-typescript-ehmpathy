import { FileCheckFunction } from 'declapract';
import flatten from 'flat';

import { readFile } from '../../../../../utils/readFile';

export const check: FileCheckFunction = async (contents, context) => {
  if (!contents) throw new Error('its fine'); // ... yeah, i know, todo: eliminate this weird "throw an error if its fine" pattern

  // grab the desired keys
  const testConfigJsonContents = await readFile(
    `${context.getProjectRootDirectory()}/config/test.json`,
  );
  if (!testConfigJsonContents)
    throw new Error('can only check if test file exists');
  const testConfigObject = JSON.parse(testConfigJsonContents);
  const flattenedTestConfigKeys = Object.keys(flatten(testConfigObject));

  // grab the found keys
  const devConfigObject = JSON.parse(contents);
  const flattenedDevConfigKeys = Object.keys(flatten(devConfigObject));

  // determine which keys are not matched
  const keysInTestButNotInDev = flattenedTestConfigKeys.filter(
    (key) => !flattenedDevConfigKeys.includes(key),
  );
  const keysInDevButNotInTest = flattenedDevConfigKeys.filter(
    (key) => !flattenedTestConfigKeys.includes(key),
  );
  if (keysInTestButNotInDev.length) return; // matches bad practice
  if (keysInDevButNotInTest.length) return; // matches bad practice

  // otherwise, does not match a bad practice
  throw new Error('its fine');
};
