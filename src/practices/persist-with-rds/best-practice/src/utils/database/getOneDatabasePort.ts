import { ConstraintError } from 'helpful-errors';

/**
 * .what = the host port a connection to the database should dial, for an access
 * .why = a worktree's local testdb binds a port of its own, so the test harness declares that
 *        port via TESTDB_PORT and the app dials it. the override is honored ONLY with test access,
 *        so a stray TESTDB_PORT can never redirect a prep or prod connection
 * .note = absent TESTDB_PORT, or any access other than test, keeps the declared port
 */
export const getOneDatabasePort = (
  input: { access: string; portDeclared: number },
  context: { env: NodeJS.ProcessEnv } = { env: process.env },
): number => {
  // only test access reaches the local testdb; every other access keeps its declared port
  if (input.access !== 'test') return input.portDeclared;

  // no override declared; the testdb binds the declared port
  const portOverride = context.env.TESTDB_PORT;
  if (portOverride === undefined || portOverride === '')
    return input.portDeclared;

  // a malformed override fails loud, so a typo never dials a port no db binds
  const port = Number(portOverride);
  if (!/^[0-9]+$/.test(portOverride) || port <= 0 || port > 65535)
    throw new ConstraintError('TESTDB_PORT is not a valid port', {
      portOverride,
      hint: 'set TESTDB_PORT to a positive integer port, or unset it to dial the declared port',
    });
  return port;
};
