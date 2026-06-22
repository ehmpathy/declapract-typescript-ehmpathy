import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

const databaseSchema = `  database: z.object({
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
      bastion: z.string(),
      cluster: z.string(),
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
  }),`;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  // if database schema already present, return as-is
  if (contents.includes('database: z.object(')) return { contents };

  // add database schema before the close of the main object
  const fixed = contents.replace(
    /(\s*)\}\);(\s*\n\s*export type Config)/,
    `$1${databaseSchema}\n});$2`,
  );

  return { contents: fixed };
};
