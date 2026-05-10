import { z } from 'zod';

export const schema = z.object({
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
        username: z.string(),
        password: z.string(),
      }),
      crud: z.object({
        username: z.string(),
        password: z.string(),
      }),
    }),
    tunnel: z.object({
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

export type Config = z.infer<typeof schema>;
