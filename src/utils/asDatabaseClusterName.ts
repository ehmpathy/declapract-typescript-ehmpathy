import { ConstraintError } from 'helpful-errors';

import { isJsonObject } from './asJsonMergedDeep';

/**
 * .what = the rds cluster name the vpc tunnel targets, for one env
 * .why  = the tunnel's `cluster.name` must name the rds CLUSTER, never the logical database
 *         inside it — the two differ in every repo that shares a cluster (#638). the first label
 *         of an rds cluster endpoint (`<cluster>.cluster-<id>.<region>.rds.amazonaws.com`) is the
 *         cluster identifier, so the name derives from the host the practice already requires.
 *         an optional `databaseClusterName` variable (a string, or one per env) overrides it, for
 *         an endpoint behind a custom dns alias. a required new variable was declined: it would
 *         throw `Variable … was not defined` in every adopter that has not declared it (F22).
 */
export const asDatabaseClusterName = (input: {
  variables: Record<string, unknown>;
  env: 'prep' | 'prod';
}): string => {
  // an explicit override wins, either one name for every env or one per env
  const override = input.variables.databaseClusterName;
  if (typeof override === 'string' && override) return override;
  const overrideForEnv = isJsonObject(override) ? override[input.env] : null;
  if (typeof overrideForEnv === 'string' && overrideForEnv) return overrideForEnv;

  // else the first label of the cluster endpoint
  const hosts = input.variables.databaseClusterHost;
  const host = isJsonObject(hosts) ? hosts[input.env] : undefined;
  if (typeof host !== 'string' || !host)
    throw new ConstraintError(
      `persist-with-rds needs databaseClusterHost.${input.env} to derive the tunnel cluster name`,
      {
        env: input.env,
        hint: `declare variables.databaseClusterHost.${input.env} (or variables.databaseClusterName) in declapract.use.yml`,
      },
    );
  return host.split('.')[0]!;
};
