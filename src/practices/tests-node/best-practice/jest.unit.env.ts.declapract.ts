// eslint-disable-next-line import/no-extraneous-dependencies

import type { FileContentsFunction } from 'declapract';
import { FileCheckType } from 'declapract';

import { readFile } from '../../../utils/readFile';

/**
 * .what = declare the jest unit-env file, with the config mock block included only when the
 *         `config` practice is in play for the project.
 * .why  = the mock stubs `getConfig` to return plaintext test config; a project WITHOUT the
 *         `config` practice has no such module to mock, so the stub would reference a file that is
 *         absent. a branch on `context.projectPractices` lets one practice serve both.
 */
export const contents: FileContentsFunction = async (context) => {
  // grab the superset of best practices content
  const contentsSuperset = await readFile(`${__dirname}/jest.unit.env.ts`);

  // remove the config mock block when the config practice is absent — immutable const, no reassign
  const contents = context.projectPractices.includes('config')
    ? contentsSuperset
    : contentsSuperset.replace(
        `// mock that getConfig just returns plaintext test env config in unit tests
jest.mock('./src/utils/config/getConfig', () => ({
  getConfig: jest.fn().mockImplementation(() => require('./config/test.json')),
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
