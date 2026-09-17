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
 * .name = `getConfig` is the org-canonical re-export of sdk-config's `genGetConfig`, called
 *         `getConfig()` at every consumer site (the ghlitch vpc tunnel among them). it is an
 *         external-package contract name, so it is exempt from the get-set-gen One/All cardinality
 *         rule — a rename to `getOneConfig` breaks every consumer + diverges from sdk-config vocab.
 */
export const getConfig = <TGrant extends Grant = 'apply'>(
  input: { grant: TGrant | null } = { grant: null },
): Promise<Config<TGrant>> => {
  // as-cast — why types miss: the runtime fallback yields the string literal
  //   'plan' | 'apply', but the compiler cannot prove that value equals the
  //   caller's free type parameter TGrant, so it stays `string`, not `TGrant`.
  // correct type: the resolved value IS the caller's TGrant (a caller who omits
  //   `grant` gets the default 'apply', which is TGrant's default).
  // removal path: a `genGetConfig` overload keyed by the grant literal (or a
  //   distributive conditional over TGrant) lets ts infer TGrant from the input
  //   and drops this assertion.
  const grant = (input.grant ??
    (process.env.GRANT === 'plan' ? 'plan' : 'apply')) as TGrant;

  // as-cast — why types miss: `loaders` is a fixed { apply, plan } map keyed by
  //   the literal grants; a lookup by the free TGrant loses the per-key return
  //   type, so ts widens the result to the union of both loaders' returns.
  // correct type: `Promise<Config<TGrant>>` — the loader at key TGrant returns
  //   exactly the config for that grant.
  // removal path: same as above — a per-grant overload or a distributive
  //   conditional narrows the map lookup per-key and drops this assertion.
  return loaders[grant]() as Promise<Config<TGrant>>;
};
