import util from 'node:util';

import { jest } from '@jest/globals';

// provide fetch for the test env, like the browser/native runtime does
import 'isomorphic-fetch';

jest.setTimeout(90000); // since the web build surface is exercised end-to-end

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

// react-test-renderer 19 requires this flag to run act() cleanly
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
