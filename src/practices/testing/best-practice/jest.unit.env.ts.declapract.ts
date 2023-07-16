// eslint-disable-next-line import/no-extraneous-dependencies
import { FileCheckType } from 'declapract';
import { FileContentsFunction } from 'declapract/dist/domain';

import { readFile } from '../../../utils/readFile';

/**
 * declare the expected contents
 */
export const contents: FileContentsFunction = async (context) => {
  // grab the superset of best practices content
  const contentsSuperset = await readFile(`${__dirname}/jest.unit.env.ts`);

  // remove things that are irrelevant, based on other practices in use in project
  let contents = contentsSuperset;
  if (!context.projectPractices.includes('config'))
    contents = contents.replace(
      `jest.mock('./src/utils/config/getConfig', () => ({
  getConfig: jest.fn().mockImplementation(() => require('./config/test.json')), // mock that getConfig just returns plaintext test env config in unit tests
}));
`,
      '',
    );

  // return the narrowed contents
  return contents;
};

/**
 * check that they're contained in the file
 */
export const check: FileCheckType = FileCheckType.CONTAINS;
