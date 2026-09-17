import util from 'node:util';

import { jest } from '@jest/globals';
import { ConstraintError } from 'helpful-errors';

// provide fetch for the test env, like the browser/native runtime does
import 'isomorphic-fetch';

jest.setTimeout(90000); // since downstream apis are reached

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

// react-test-renderer 19 requires this flag to run act() cleanly
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * sanity check that integration tests only run in the 'test' environment
 * .why = prevent prod state pollution + financial mutations from test data
 */
if (process.env.NODE_ENV !== 'test' && process.env.I_KNOW_THE_RISKS !== 'true')
  throw new ConstraintError(
    `integration.test config must be 'test' — set NODE_ENV=test (or I_KNOW_THE_RISKS=true to override)`,
    { nodeEnv: process.env.NODE_ENV ?? null },
  );
