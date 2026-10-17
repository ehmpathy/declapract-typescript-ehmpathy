import type { FileCheckFunction } from 'declapract';

import { isConfigShapeDivergent } from '../../../../../utils/isConfigShapeDivergent';
import { readFile } from '../../../../../utils/readFile';

export const check: FileCheckFunction = async (contents, context) => {
  if (!contents) throw new Error('its fine'); // ... yeah, i know, todo: eliminate this weird "throw an error if its fine" pattern

  // grab the desired shape
  const testConfigJsonContents = await readFile({
    filePath: `${context.getProjectRootDirectory()}/config/test.json`,
  });
  if (!testConfigJsonContents)
    throw new Error('can only check if test file exists');

  // matches bad practice when the prep shape diverges from the test shape
  if (
    isConfigShapeDivergent({
      expected: JSON.parse(testConfigJsonContents),
      found: JSON.parse(contents),
    })
  )
    return;

  // otherwise, does not match a bad practice
  throw new Error('its fine');
};
