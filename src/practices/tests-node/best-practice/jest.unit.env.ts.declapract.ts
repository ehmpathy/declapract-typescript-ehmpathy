// eslint-disable-next-line import/no-extraneous-dependencies

import type { FileContentsFunction } from 'declapract';
import { FileCheckType } from 'declapract';

import { readFile } from '../../../utils/readFile';

/**
 * .what = the `access` import the template carries, emitted only with the `environments` practice
 */
const ACCESS_IMPORT = `import { access } from './src/utils/environment';`;

/**
 * .what = the `access` derivation emitted in place of the import, when `environments` is absent
 * .why  = sdk-environment reads `ACCESS`; jest sets `NODE_ENV=test` when unset — so the guard
 *         still passes by default and still blocks a suite run with `ACCESS=prod`.
 */
const ACCESS_FROM_ENVARS = `// the access this suite runs with — the ACCESS envar, else jest's own NODE_ENV
const access = process.env.ACCESS ?? process.env.NODE_ENV;`;

/**
 * .what = declare the jest unit-env file, narrowed to the practices in play for the project:
 *         - the config mock block only when the `config` practice is in play
 *         - the `access` import only when the `environments` practice is in play
 * .why  = the mock stubs `getConfig` to return plaintext test config; a project WITHOUT the
 *         `config` practice has no such module to mock, so the stub would reference a file that is
 *         absent. likewise `src/utils/environment` is emitted only by `environments`, so without it
 *         the import is TS2307 — `access` is derived from the envars instead. a branch on
 *         `context.projectPractices` lets one practice serve every usecase (rule.avoid.runtime-forks).
 * .note = check is CONTAINS: an extant file is never rewritten (declapract only creates an absent
 *         one), so a narrow `--practice tests-node` apply that darkens `environments` strips naught.
 */
export const contents: FileContentsFunction = async (context) => {
  // grab the superset of best practices content
  const contentsSuperset = await readFile({
    filePath: `${__dirname}/jest.unit.env.ts`,
  });

  // remove the config mock block when the config practice is absent — immutable const, no reassign
  const contentsForConfig = context.projectPractices.includes('config')
    ? contentsSuperset
    : contentsSuperset.replace(
        `// mock that getConfig just returns plaintext test env config in unit tests
jest.mock('./src/utils/config/getConfig', () => ({
  getConfig: jest.fn().mockImplementation(() => require('./config/test.json')),
}));

`,
        '',
      );

  // derive access from the envars when the environments practice is absent
  const contentsForEnvironments = context.projectPractices.includes(
    'environments',
  )
    ? contentsForConfig
    : contentsForConfig.replace(ACCESS_IMPORT, ACCESS_FROM_ENVARS);

  // return the narrowed contents
  return contentsForEnvironments;
};

/**
 * check that they're contained in the file
 */
export const check: FileCheckType = FileCheckType.CONTAINS;
