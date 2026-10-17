import {
  genGetConfig,
  genSdkConfigSupplierAwsParameterStore,
} from 'sdk-config';
import { createCache } from 'simple-in-memory-cache';

import { envStatic } from '@src/utils/environment';

import { type Config, type Grant, schema } from './config.schema';

// one loader per grant, each with its own cache (see the config practice readme)
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
 * .what = load the config for an oidc grant: `apply` (default) or `plan`, via input or GRANT=plan
 * .why = `plan` tolerates the secrets its role may not read; `apply` keeps every secret required
 */
export const getConfig = <TGrant extends Grant = 'apply'>(
  input: { grant: TGrant | null } = { grant: null },
): Promise<Config<TGrant>> => {
  // as-cast: the fallback grant is the caller's TGrant. removal path: a per-grant overload
  const grant = (input.grant ??
    (process.env.GRANT === 'plan' ? 'plan' : 'apply')) as TGrant;

  // as-cast: the loader at key TGrant returns Config<TGrant>. removal path: as above
  return loaders[grant]() as Promise<Config<TGrant>>;
};
