import {
  genGetConfig,
  genSdkConfigSupplierAwsParameterStore,
} from 'sdk-config';
import { createCache } from 'simple-in-memory-cache';

import { envStatic } from '../environment';
import { type Config, type Grant, schema } from './config.schema';

// one loader per grant. both read the same config/*.json + suppliers; they differ
// only in which schema arbitrates the reader-denied secrets (see config.schema.ts).
// caches are separate so a plan miss never poisons the apply cache.
const common = {
  statics: 'config/*.json' as const,
  suppliers: [genSdkConfigSupplierAwsParameterStore()],
  environment: {
    config: envStatic.config,
    server: envStatic.server,
  },
};
const loaders = {
  apply: genGetConfig({
    ...common,
    schema: schema.apply,
    cache: createCache({ expiration: { minutes: 5 } }),
  }),
  plan: genGetConfig({
    ...common,
    schema: schema.plan,
    cache: createCache({ expiration: { minutes: 5 } }),
  }),
} as const;

/**
 * .what = load the config, scoped to an oidc grant (default apply).
 * .why = default 'apply' returns the fully-required Config, so ordinary consumers
 *        get no `| undefined` in their config type. the plan job opts into 'plan'
 *        (which tolerates the reader-denied secrets) either explicitly via
 *        { grant: 'plan' } or implicitly via the GRANT=plan env — the latter lets
 *        the ghlitch vpc tunnel (which calls getConfig() with no args) pick the
 *        plan scope at runtime without a code change.
 */
export function getConfig<TGrant extends Grant = 'apply'>(input?: {
  grant?: TGrant;
}): Promise<Config<TGrant>> {
  const grant = (input?.grant ??
    (process.env.GRANT === 'plan' ? 'plan' : 'apply')) as TGrant;

  return loaders[grant]() as Promise<Config<TGrant>>;
}
