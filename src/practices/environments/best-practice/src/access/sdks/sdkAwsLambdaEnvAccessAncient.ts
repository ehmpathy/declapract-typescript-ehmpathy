import type { EnvironmentAccessTier } from 'sdk-environment';

import { envStatic } from '@src/utils/environment';

/**
 * .what = the fleet slug a caller addresses a peer lambda by.
 * .why  = it is an access (`test | prep | prod`) OR the legacy `dev` slug an
 *         ancient peer still publishes under. a first-class `dev` member keeps the slug
 *         compiler-tracked — never an `as`-cast that lies a `dev` value through a type
 *         that forbids it (the exact silent fault this transition exists to kill).
 */
export type LambdaEnvSlug = EnvironmentAccessTier | 'dev';

/**
 * .what = address an **ancient** peer — one that publishes `-dev-` only.
 * .why  = `askLambdaEndpoint` builds its target as `${service}-${access}-${function}`.
 *         an ancient peer publishes under a legacy `dev` slug that disagrees with
 *         **access** (`test | prep | prod`) below prod (`access=prep` ⟺ deployed name
 *         `dev`). so a caller emits the legacy `dev` slug below prod, because that is the
 *         only name the peer publishes. `prod` maps to `prod` on both.
 * .note = the helper choice IS the migration ledger: `grep AccessAncient` lists every
 *         peer still published under `-dev-` only. once zero remain, this ancient branch
 *         — and the divergent `dev` slug — retire together, alongside its contemp
 *         counterpart `sdkAwsLambdaEnvAccessContemp`. the return type is `LambdaEnvSlug`,
 *         so the `dev` slug flows with a compiler-tracked type — no cast, no lie.
 */
export const sdkAwsLambdaEnvAccessAncient = (
  input?: { access: EnvironmentAccessTier | null },
): LambdaEnvSlug => {
  const access = input?.access ?? envStatic.access;
  return access === 'prod' ? 'prod' : 'dev';
};
