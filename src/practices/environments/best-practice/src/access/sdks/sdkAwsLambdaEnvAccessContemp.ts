import type { EnvironmentAccessTier } from 'sdk-environment';

import { envStatic } from '@src/utils/environment';

/**
 * .what = address a **contemp** peer, or **self** — one that publishes `-prep-`.
 * .why  = emit the access direct; no bridge is needed once the callee is
 *         published under the access slug. the contemp counterpart of
 *         `sdkAwsLambdaEnvAccessAncient`: as peers migrate, a caller flips
 *         `Ancient → Contemp` per peer, and `grep AccessAncient` at zero is the exit.
 */
export const sdkAwsLambdaEnvAccessContemp = (
  input?: { access: EnvironmentAccessTier | null },
): EnvironmentAccessTier => input?.access ?? envStatic.access;
