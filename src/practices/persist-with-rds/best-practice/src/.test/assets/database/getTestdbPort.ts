import { getTestdbIdentity } from './getTestdbIdentity';

/**
 * .what = the host port this checkout's testdb binds, for an access
 * .why = the test harness and the schema provisioner ask here, so the compose file, the jest env
 *        (which hands the port to the app via TESTDB_PORT), and the provisioner of one worktree
 *        all agree on one port
 * .note = only `test` access reaches the local testdb; any other access keeps its declared port
 * .note = a test asset: the app never imports it. the app reads TESTDB_PORT via getOneDatabasePort
 */
export const getTestdbPort = (input: {
  access: string;
  portDeclared: number;
}): number => {
  if (input.access !== 'test') return input.portDeclared;
  return getTestdbIdentity({ portDeclared: input.portDeclared }).port;
};
