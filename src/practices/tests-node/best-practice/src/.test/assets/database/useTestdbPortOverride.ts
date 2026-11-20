import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';

import {
  getOneTestConfig,
  asTestdbPortDeclared,
} from '../../../../jest.integration.env.db';

/**
 * .what = declare this checkout's testdb port as TESTDB_PORT, for the app under test to dial
 * .why = persist-with-rds gives each worktree a testdb on a port of its own. the app reads that
 *        port from TESTDB_PORT, and only with test access, so the harness must declare it before
 *        a test opens a connection — else a worktree's suite dials the declared port and reads
 *        another checkout's db
 * .note = the port comes from persist-with-rds's `src/.test/assets/database/getTestdbPort`, the
 *         same helper the compose file and the schema provisioner ask. tests-node also serves repos
 *         without persist-with-rds, so the helper is read at runtime where present, never imported;
 *         absent, this declares naught and the app dials its declared port
 */
export const useTestdbPortOverride = (): void => {
  // without the persist-with-rds helper, there is no per-worktree port to declare
  const helperPath = join(
    process.cwd(),
    'src',
    '.test',
    'assets',
    'database',
    'getTestdbPort.ts',
  );
  if (!existsSync(helperPath)) return;

  // a helper whose export drifted is a fault to name, never a bare TypeError
  const helper: {
    getTestdbPort?: (input: { access: string; portDeclared: number }) => number;
  } = require(helperPath);
  if (typeof helper.getTestdbPort !== 'function')
    throw new ConstraintError(
      'src/.test/assets/database/getTestdbPort.ts exports no getTestdbPort function',
      {
        helperPath,
        hint: 'export `getTestdbPort({ access, portDeclared })` from that file, or run `npx declapract apply` to restore it',
      },
    );

  // the declared port lives in config/test.json; persist-with-rds owes it, so its absence is loud
  const testConfigPath = join(process.cwd(), 'config', 'test.json');
  const testConfig = getOneTestConfig({ path: testConfigPath });
  if (testConfig === null)
    throw new ConstraintError(
      'config/test.json not found — the testdb port cannot be derived',
      {
        testConfigPath,
        hint: 'add config/test.json with database.tunnel.local.port, or run `npx declapract apply` to restore it',
      },
    );
  const portDeclared = asTestdbPortDeclared({ testConfig });
  if (portDeclared === null)
    throw new ConstraintError(
      'config/test.json declares no database.tunnel.local.port — the testdb port cannot be derived',
      {
        testConfigPath,
        hint: 'declare database.tunnel.local.port in config/test.json, or run `npx declapract apply` to restore it',
      },
    );

  // declare the port; the harness runs only with test access, which the app's override requires
  process.env.TESTDB_PORT = String(
    helper.getTestdbPort({ access: 'test', portDeclared }),
  );
};
