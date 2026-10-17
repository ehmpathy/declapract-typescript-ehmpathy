import { z } from 'zod';

/** .what = the two oidc grant scopes config can be read under. */
export type Grant = 'plan' | 'apply';

/**
 * .what = the config schema for one grant: `plan` marks the secrets its role may not read optional
 * .why = see "config grants" in the persist-with-rds practice readme
 */
const getOneSchema = <TGrant extends Grant>(grant: TGrant) => {
  // required under apply; optional under plan
  const secret = <T extends z.ZodTypeAny>(
    schema: T,
  ): TGrant extends 'plan' ? z.ZodOptional<T> : T =>
    // as-cast: the runtime branch matches the conditional type one-to-one.
    // removal path: microsoft/TypeScript#33912, or two monomorphic overloads
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
          // each grant role may map to its own db user; only for-apply's password is a secret
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

/** .what = one schema per grant; getConfig picks one at call time */
export const schema = {
  apply: getOneSchema('apply'),
  plan: getOneSchema('plan'),
} as const;

/** .what = the config type for a grant; the default `apply` carries no `| undefined` */
export type Config<TGrant extends Grant = 'apply'> = z.infer<
  (typeof schema)[TGrant]
>;
