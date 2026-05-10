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
});

export type Config = z.infer<typeof schema>;
