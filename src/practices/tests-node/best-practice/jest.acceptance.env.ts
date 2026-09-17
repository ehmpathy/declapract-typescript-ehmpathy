import { existsSync } from 'node:fs';
import { join } from 'node:path';
import util from 'node:util';

import { jest } from '@jest/globals';
import { ConstraintError } from 'helpful-errors';

import { useKeyrack } from './src/.test/useKeyrack';

jest.setTimeout(90000); // we're calling downstream apis

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're running from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new ConstraintError(
    'no package.json found in cwd — run the acceptance suite from the git root',
    { cwd: process.cwd() },
  );

/**
 * .what = source credentials from keyrack for the target tier and export them for the aws-sdk-v2
 *         lambda caller, in one call.
 * .why =
 *   - a cloud acceptance run targets a deployed tier (e.g. prep), derived from ACCESS; default to the
 *     lowest-privilege `test` when unset, so a PR / local in-process run stays on test creds.
 *   - useKeyrack is the org convention: it sources keyrack (sets AWS_PROFILE), sets ACCESS, and — for
 *     an aws consumer — exports the sso profile's static creds so aws-sdk-v2 auths against the target
 *     (keyrack.source alone sets only AWS_PROFILE, which v2 cannot use). #586.
 *   - `strict` fails fast with a helpful error if keyrack is locked or a key is absent.
 */
useKeyrack({ env: (process.env.ACCESS ?? 'test') as 'test' | 'prep' | 'prod', mode: 'strict' });
