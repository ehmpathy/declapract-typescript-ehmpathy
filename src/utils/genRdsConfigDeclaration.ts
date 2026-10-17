import type {
  FileCheckFunction,
  FileContentsFunction,
  FileFixFunction,
} from 'declapract';

import { asDatabaseClusterName } from './asDatabaseClusterName';
import {
  asJsonMergedDeep,
  isJsonObject,
  type JsonLeafKeepRule,
} from './asJsonMergedDeep';
import { getAllJsonDriftPaths } from './getAllJsonDriftPaths';
import { readFile } from './readFile';

type RdsConfigEnv = 'test' | 'prep' | 'prod';

const BARE_PARAM = '$.at(aws::param)';
const PREP_PASSWORD_PLACEHOLDER = '__CHANG3_ME__';

/**
 * .what = which found leaves of an rds config may stand in for the declared ones
 * .why  = three leaves accept more than the declared value, so neither the check nor the merge
 *         flips a value a repo holds on purpose:
 *         - an explicit `$.at(aws::param/…)` path satisfies a declared bare `$.at(aws::param)` — an
 *           auto-flip would read a param that may hold no value yet (#544, F78)
 *         - prep's passwords accept `__CHANG3_ME__`, the password `deploy.database.sh` gives prep
 *           users, as well as `$.at(aws::param)`, so a repo that seeded real prep secrets keeps
 *           them and a repo on the placeholder keeps it (#683, F58)
 *         - a hand-set `tunnel.cluster.name` or `tunnel.bastion.exid` is kept; the derived value
 *           only seeds an absent one (#638)
 */
const genRdsConfigLeafKeepRule =
  (input: { env: RdsConfigEnv }): JsonLeafKeepRule =>
  ({ path, declared, found }) => {
    const leaf = path.join('.');
    const isPassword = leaf.endsWith('.password');

    // an explicit param path satisfies a declared bare placeholder
    if (
      isPassword &&
      declared === BARE_PARAM &&
      typeof found === 'string' &&
      found.startsWith('$.at(aws::param/')
    )
      return true;

    // prep keeps the placeholder its own provision creates users with
    if (
      input.env === 'prep' &&
      isPassword &&
      declared === BARE_PARAM &&
      found === PREP_PASSWORD_PLACEHOLDER
    )
      return true;

    // a hand-set tunnel cluster name or bastion exid is kept
    const isTunnelName =
      leaf === 'database.tunnel.cluster.name' ||
      leaf === 'database.tunnel.bastion.exid';
    return isTunnelName && typeof found === 'string' && found.length > 0;
  };

/**
 * .what = list the legacy string-form tunnel fields of a found config
 * .why  = templates before #638 wrote `bastion` and `cluster` as strings, which the schema rejects
 *         (it demands `{ exid }` / `{ name }`, #539 7a). a found string is dropped before the
 *         merge, so the declared object takes its place, and the check flags it.
 */
const getAllLegacyTunnelStringPaths = (input: { found: unknown }): string[] => {
  const database = isJsonObject(input.found) ? input.found.database : null;
  const tunnel = isJsonObject(database) ? database.tunnel : null;
  if (!isJsonObject(tunnel)) return [];
  return ['bastion', 'cluster']
    .filter((key) => typeof tunnel[key] === 'string')
    .map((key) => `database.tunnel.${key}`);
};

/**
 * .what = drop the legacy string-form tunnel fields from a found config
 */
const asConfigWithoutLegacyTunnelStrings = (input: {
  found: unknown;
}): unknown => {
  // reach the tunnel; a config with no tunnel object has no legacy field to drop
  if (!isJsonObject(input.found)) return input.found;
  const database = input.found.database;
  if (!isJsonObject(database)) return input.found;
  const tunnel = database.tunnel;
  if (!isJsonObject(tunnel)) return input.found;

  // drop each string-valued bastion / cluster, keep every other key in place
  const isLegacy = (key: string): boolean =>
    (key === 'bastion' || key === 'cluster') && typeof tunnel[key] === 'string';
  return {
    ...input.found,
    database: {
      ...database,
      tunnel: Object.fromEntries(
        Object.entries(tunnel).filter(([key]) => !isLegacy(key)),
      ),
    },
  };
};

/**
 * .what = the declaration (contents, check, fix) of one persist-with-rds `config/{env}.json`
 * .why  = the three env files share one shape of logic:
 *         - contents: the template, with the tunnel cluster name derived from the cluster host
 *           (prep, prod)
 *         - check: the found config contains every declared value (deep), with the leaf keep rule,
 *           and holds no legacy string-form tunnel field
 *         - fix: a deep merge, so the repo's own keys survive (#539 7c) — the shallow spread it
 *           replaces swapped the whole `database` subtree
 *         one generator keeps the check and the fix on one rule, so the check passes on exactly
 *         what the fix writes (idempotent by construction).
 */
export const genRdsConfigDeclaration = (input: {
  env: RdsConfigEnv;
  templatePath: string;
}): {
  contents: FileContentsFunction;
  check: FileCheckFunction;
  fix: FileFixFunction;
} => {
  const isLeafKept = genRdsConfigLeafKeepRule({ env: input.env });
  const env = input.env;

  const contents: FileContentsFunction = async (context) => {
    // test tunnels to no cluster, but keeps prep's tunnel shape so the three configs share one
    // key set (config's divergent-config-shapes check)
    const template = await readFile({ filePath: input.templatePath });
    const clusterName = asDatabaseClusterName({
      variables: context.projectVariables,
      env: env === 'test' ? 'prep' : env,
    });
    return template
      .split('@declapract{variable.databaseClusterName}')
      .join(clusterName);
  };

  const check: FileCheckFunction = (found, context) => {
    if (!found) throw new Error(`config/${env}.json is absent`);
    const drift = [
      ...getAllJsonDriftPaths({
        declared: JSON.parse(context.declaredFileContents!),
        found: JSON.parse(found),
        path: [],
        isLeafKept,
      }),
      ...getAllLegacyTunnelStringPaths({ found: JSON.parse(found) }),
    ];
    if (drift.length)
      throw new Error(
        `config/${env}.json differs from the declared config at: ${drift.join(', ')}`,
      );
  };

  const fix: FileFixFunction = (found, context) => {
    if (!found) return { contents: context.declaredFileContents };
    const merged = asJsonMergedDeep({
      declared: JSON.parse(context.declaredFileContents!),
      found: asConfigWithoutLegacyTunnelStrings({ found: JSON.parse(found) }),
      path: [],
      isLeafKept,
    });
    return { contents: `${JSON.stringify(merged, null, 2)}\n` };
  };

  return { contents, check, fix };
};
