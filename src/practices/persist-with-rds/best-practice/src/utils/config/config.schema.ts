import { z } from 'zod';

/** .what = the two oidc grant scopes config can be read under. */
export type Grant = 'plan' | 'apply';

/**
 * .what = get the config schema for a given oidc grant.
 * .why = the prod plan job's oidc role is DENIED every ssm secret except the
 *        for-plan db credential. under grant=plan the
 *        eagerly-read getConfig() cannot read for-apply's password (or any other
 *        secret); sdk-config substitutes undefined for each denied param, so those
 *        must be .optional() to tolerate the miss. grant=apply (the default — apply
 *        job, cloud runtime, local dev, tests) keeps every secret REQUIRED, so its
 *        inferred type carries no `| undefined` and needs no guards at consumers.
 * .note = grant is a per-schema arg, NOT read from env here; getConfig picks which
 *         schema to parse with at call time (see getConfig.ts).
 */
const getOneSchema = <TGrant extends Grant>(grant: TGrant) => {
  // required by default; optional only under grant=plan. generic on the LITERAL
  // TGrant so each schema infers monomorphically (all-required for apply,
  // reader-denied-optional for plan) instead of the widened union.
  const secret = <T extends z.ZodTypeAny>(
    schema: T,
  ): TGrant extends 'plan' ? z.ZodOptional<T> : T =>
    // as-cast — why types miss: TS cannot relate a conditional return type
    //   (`TGrant extends 'plan' ? … : …`) to a runtime `grant === 'plan'`
    //   ternary; the two are unrelated to the checker, so the ternary widens to
    //   `ZodOptional<T> | T` and does not fit the declared conditional return.
    // correct type: the value IS `ZodOptional<T>` when TGrant='plan' and `T`
    //   otherwise — exactly the declared return; the runtime branch matches the
    //   type branch one-to-one, so the assertion is sound.
    // removal path: TS learns to relate a conditional return type to a runtime
    //   discriminant check (microsoft/TypeScript#33912), or the caller splits
    //   into two monomorphic overloads that never share this body.
    (grant === 'plan' ? schema.optional() : schema) as TGrant extends 'plan'
      ? z.ZodOptional<T>
      : T;

  return z.object({
    organization: z.string(),
    project: z.string(),
    environment: z.object({
      access: z.enum(['test', 'prep', 'prod']),
    }),
    aws: z.object({
      account: z.string(),
      namespace: z.string(),
    }),
    database: z.object({
      target: z.object({
        database: z.string(),
        schema: z.string(),
      }),
      role: z.object({
        cicd: z.object({
          // for-plan and for-apply may map to DIFFERENT db users (e.g. a readonly
          // user for-plan), so each carries its own username. names mirror the prod
          // oidc roles (for-plan / for-apply) that read them.
          // .note: only for-apply's PASSWORD is reader-denied under grant=plan; the
          // username is a readable static, so the object is always present. mark the
          // password itself as the secret (a secret() on the whole object would never
          // tolerate the miss — the present object still validates its required password).
          'for-plan': z.object({ username: z.string(), password: z.string() }),
          'for-apply': z.object({
            username: z.string(),
            password: secret(z.string()),
          }),
        }),
        crud: z.object({
          username: z.string(),
          password: secret(z.string()),
        }),
      }),
      tunnel: z.object({
        bastion: z.object({ exid: z.string() }).optional(),
        cluster: z.object({ name: z.string() }).optional(),
        local: z.object({
          host: z.string(),
          port: z.number(),
        }),
        lambda: z
          .object({
            host: z.string(),
            port: z.number(),
          })
          .nullable(),
      }),
    }),
  });
};

/**
 * .what = one schema per grant. apply = every secret required (the default);
 *         plan = the reader-denied secrets optional.
 * .why = getConfig picks which to parse with by grant (see getConfig.ts).
 */
export const schema = {
  apply: getOneSchema('apply'),
  plan: getOneSchema('plan'),
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
