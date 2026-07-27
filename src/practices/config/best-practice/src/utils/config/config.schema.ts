import { z } from 'zod';

/** .what = the two oidc grant scopes config can be read under. */
export type Grant = 'plan' | 'apply';

/**
 * .what = the base config shape, before any grant-scoped secrets are added.
 * .why = this base template carries no reader-denied secrets, so plan and apply
 *        infer the same schema. services that add secrets (e.g. api keys, db
 *        credentials) should make each reader-denied secret grant-aware via a
 *        secret() helper so the prod plan job's oidc role tolerates the miss —
 *        see the persist-with-rds config.schema.ts for the full pattern.
 */
const base = z.object({
  organization: z.string(),
  project: z.string(),
  environment: z.object({
    access: z.enum(['test', 'prep', 'prod']),
  }),
  aws: z.object({
    account: z.string(),
    namespace: z.string(),
  }),
});

/**
 * .what = one schema per grant. apply = the default (every secret required);
 *         plan = the reader-denied secrets optional.
 * .why = getConfig picks which to parse with by grant (see getConfig.ts).
 */
export const schema = {
  apply: base,
  plan: base,
} as const;

/**
 * .what = the config type for a grant, default apply.
 * .why = Config (= Config<'apply'>) is the fully-required shape ordinary consumers
 *        get, so no `| undefined` leaks into the app's config type; Config<'plan'>
 *        is the opt-in narrowed shape whose reader-denied secrets may be absent.
 */
export type Config<TGrant extends Grant = 'apply'> = z.infer<
  (typeof schema)[TGrant]
>;
