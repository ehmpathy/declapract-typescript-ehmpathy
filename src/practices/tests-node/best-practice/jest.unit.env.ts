import { existsSync } from 'node:fs';
import { join } from 'node:path';
import util from 'node:util';

import { jest } from '@jest/globals';
import { ConstraintError } from 'helpful-errors';

import { access } from './src/utils/environment';

// mock that getConfig just returns plaintext test env config in unit tests
jest.mock('./src/utils/config/getConfig', () => ({
  getConfig: jest.fn().mockImplementation(() => require('./config/test.json')),
}));

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're at a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new ConstraintError(
    'no package.json found in cwd — run the unit suite from the git root',
    { cwd: process.cwd() },
  );

/**
 * sanity check that unit tests are only run the 'test' environment
 *
 * usecases
 * - prevent prod state pollution with test data
 * - prevent financial mutations
 */
if (access !== 'test' && process.env.I_KNOW_THE_RISKS !== 'true')
  throw new ConstraintError(
    `unit tests must target the 'test' tier — set I_KNOW_THE_RISKS=true to override`,
    { access },
  );
