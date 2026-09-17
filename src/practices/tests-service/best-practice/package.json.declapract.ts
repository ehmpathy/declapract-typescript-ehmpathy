import { FileCheckType, type FileContentsFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';

import { existsSync } from 'node:fs';
import { readFile } from '../../../utils/readFile';

/**
 * .what = declare the tests-service package.json, with the `start:livedb:prep` wake command
 *         included only when this service REACHES the shared aurora-serverless cluster —
 *         signalled by a `database.tunnel` block in its own `config/prep.json`.
 * .why  = the cicd-common test workflow already runs `npm run start:livedb:prep --if-present`
 *         in both the integration + acceptance shards, but the command lived ONLY in
 *         persist-with-rds — so a gateway/fan-out service (owns no db, but invokes peers that
 *         query the shared cluster) never got it, the `--if-present` step no-op'd, and the
 *         min-capacity-0 prep cluster was never woken in ci (#598). tests-service covers the
 *         whole lambda-service set (gateways AND rds services), so it is the common-denominator
 *         home for the wake. but a lambda-service that reaches NO cluster (no tunnel) must NOT
 *         get it — else its `--if-present` step would fire `rhx use.rds.capacity` against a
 *         cluster it does not use and could FAIL the job (the step has no swallow). so the emit
 *         is self-gated on the tunnel: the same signal `useWakeOfLivedb` uses locally.
 * .note = the discriminant is the CONSUMER's `config/prep.json`, not `context.projectPractices` —
 *         a gateway declares its tunnel in config, not via a db-ownership practice. so this reads
 *         the neighbor file via `getProjectRootDirectory()`, the check-context escape hatch.
 * .note = persist-with-rds ALSO declares this command; both emit the IDENTICAL line, so an rds
 *         service converges on one entry (the multi-declarer convergence pattern, as with the
 *         repo-root .gitignore). additive by design — this does not touch persist-with-rds.
 */

/**
 * .what = read whether the consumer declares a db tunnel in its config/<env>.json.
 * .why  = the tunnel is the signal a service reaches the shared cluster (owns the db, or invokes
 *         peers that query it). names the neighbor-read as one intent rather than an inline
 *         positional decode (rule.forbid.inline-decode-friction).
 * .note = an ABSENT config is benign — a service that declares no config/<env>.json reaches no
 *         known cluster, so it returns false and gets no wake command (a false-negative just omits
 *         a latency nicety, never breaks a suite; contrast the RUNTIME useWakeOfLivedb, likewise soft
 *         on absence). but a PRESENT-yet-unparseable config is NOT benign: it means the consumer
 *         authored a config the build cannot read, so a silent `return false` would conflate a
 *         broken config with an absent tunnel (`rule.forbid.failhide`). so absence returns false
 *         and a parse failure rethrows with context, naming the file to repair.
 */
const readReachesSharedCluster = async (input: {
  projectRoot: string;
  env: 'prep';
}): Promise<boolean> => {
  const configPath = `${input.projectRoot}/config/${input.env}.json`;
  if (!existsSync(configPath)) return false; // no config = no known cluster (benign)
  const raw = await readFile({ filePath: configPath });
  try {
    return !!JSON.parse(raw)?.database?.tunnel;
  } catch (cause) {
    // a non-Error throw is unexpected here; rethrow it verbatim rather than reclassify it
    if (!(cause instanceof Error)) throw cause;
    // a config the consumer authored but the build cannot parse is a real defect, not "no
    // cluster" — a caller-must-fix condition, so throw a ConstraintError (exit 2) that NAMES the
    // file, to match asPackageJSON's own class for the identical malformed-JSON case, so a
    // consumer can machine-distinguish "my config is broken" from a server malfunction (never a
    // silent false — `rule.forbid.failhide` / `rule.require.exit-code-semantics`)
    throw new ConstraintError(
      `tests-service: could not parse ${configPath} as JSON — fix the malformed config so the wake-command gate can read its database.tunnel signal`,
      { cause },
    );
  }
};

/**
 * .what = return the package.json without the `start:livedb:prep` wake command; a `scripts` block
 *         the strip leaves empty is removed too.
 * .why  = names the tunnel-gated strip as one intent, so `contents` reads what-not-how rather than
 *         an inline mutate-then-count-then-delete sequence a reader must simulate
 *         (`rule.forbid.inline-decode-friction`). pure over a fresh clone of `pkg`, so the caller's
 *         object is untouched and the leaf is independently testable.
 */
const withoutWakeCommand = (input: {
  pkg: Record<string, any>;
}): Record<string, any> => {
  const pkg = { ...input.pkg, scripts: { ...input.pkg.scripts } };
  delete pkg.scripts['start:livedb:prep'];
  if (Object.keys(pkg.scripts).length === 0) delete pkg.scripts;
  return pkg;
};

export const contents: FileContentsFunction = async (context) => {
  // the superset: the package.json with the wake command included
  const superset = JSON.parse(
    await readFile({ filePath: `${__dirname}/package.json` }),
  );

  // keep the wake command when this service reaches the shared cluster; strip it otherwise
  const reachesSharedCluster = await readReachesSharedCluster({
    projectRoot: context.getProjectRootDirectory(),
    env: 'prep',
  });
  const emitted = reachesSharedCluster
    ? superset
    : withoutWakeCommand({ pkg: superset });

  return `${JSON.stringify(emitted, null, 2)}\n`;
};

export const check = FileCheckType.CONTAINS;
