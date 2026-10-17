import { realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getModuleExportsFromTsSource } from '../../utils/getModuleExportsFromTsSource';

/**
 * .what = clamps that the config/{test,prep,prod}.json a lambda-service-with-rds apply writes
 *         parse under the config.schema.ts that same apply writes — for a fresh repo, and for a
 *         repo that holds its own hand-set values.
 * .why  = the templates once wrote `tunnel.bastion` / `tunnel.cluster` as strings while the schema
 *         demands `{ exid }` / `{ name }`, wrote the logical db name where the rds cluster name
 *         belongs, and the fix swapped the whole `database` subtree so a repo's own keys vanished
 *         (#638, #523, #562, #539). prep's passwords accept the `__CHANG3_ME__` placeholder its
 *         provision creates users with (#683). prep and prod tunnel on distinct local ports (#519).
 * .teeth = restore the string-form bastion/cluster in config/prep.json, or the shallow-spread fix
 *          in config/prep.json.declapract.ts, and the safeParse and extras-survive cases redden.
 * .note = the schema is transpiled and run against the zod declapract itself installs (zod is not
 *         a root dep of this repo); the parse reads what the emitted source returns.
 */

const ENVS = ['test', 'prep', 'prod'] as const;
const SCHEMA_PATH = 'src/utils/config/config.schema.ts';

// mount the real practices under `declarations/`, so the apply writes into the temp repo's own src
const DECLARATIONS_SYMLINKS = [
  { at: 'declarations/practices', to: 'src/practices' },
  { at: 'declarations/useCases.yml', to: 'src/useCases.yml' },
];

// zod, as declapract installs it
const requireFromDeclapract = createRequire(
  realpathSync(path.join(process.cwd(), 'node_modules/declapract/package.json')),
);

type SchemaFound = {
  apply: { safeParse: (value: unknown) => { success: boolean; error?: unknown } };
};

/**
 * .what = transpile an emitted config.schema.ts and return its `schema` export
 */
const asSchemaFromSource = (input: { src: string }): SchemaFound => {
  const requireStub = (id: string): unknown => {
    if (id === 'zod') return requireFromDeclapract('zod');
    throw new Error(`unexpected require in config.schema.ts: ${id}`);
  };
  const { schema } = getModuleExportsFromTsSource<{ schema: SchemaFound }>({
    source: input.src,
    requireStub,
  });
  return schema!;
};

/**
 * .what = apply one file with each of its two declarers, in declapract's own order (config, then
 *         persist-with-rds)
 * .why  = a whole-usecase evaluation per file costs minutes; neither declarer branches on
 *         `projectPractices`, so a per-practice scope applies the same declarations
 */
const applyFile = async (input: { tempDir: string; file: string }) => {
  for (const practice of ['config', 'persist-with-rds'])
    await executeApply({
      config: path.join(input.tempDir, 'declapract.use.yml'),
      practice,
      file: input.file,
    });
};

/**
 * .what = apply the three config files and the schema, in that order
 */
const applyConfigAndSchema = async (input: { tempDir: string }) => {
  for (const env of ENVS)
    await applyFile({ tempDir: input.tempDir, file: `config/${env}.json` });
  await applyFile({ tempDir: input.tempDir, file: SCHEMA_PATH });
};

/**
 * .what = read every config file + the schema off disk
 */
const readAll = async (input: {
  tempDir: string;
}): Promise<{ configs: Record<string, string>; schemaSrc: string }> => {
  const configs: Record<string, string> = {};
  for (const env of ENVS)
    configs[env] = await fs.readFile(
      path.join(input.tempDir, `config/${env}.json`),
      'utf-8',
    );
  const schemaSrc = await fs.readFile(
    path.join(input.tempDir, SCHEMA_PATH),
    'utf-8',
  );
  return { configs, schemaSrc };
};

/**
 * .what = the parse outcome of each config under schema.apply
 */
const getAllParseOutcomes = (input: {
  configs: Record<string, string>;
  schemaSrc: string;
}) => {
  const schema = asSchemaFromSource({ src: input.schemaSrc });
  return ENVS.map((env) => {
    const result = schema.apply.safeParse(JSON.parse(input.configs[env]!));
    return { env, success: result.success, error: result.error };
  });
};

// whole-usecase evaluation per file runs tens of seconds
jest.setTimeout(600_000);

describe('persist-with-rds config validates against config.schema.ts (#638, #683, #519)', () => {
  given('[case1] a fresh repo', () => {
    const tempDir = genTempDir({
      slug: 'declapract-persist-with-rds-config-schema-fresh',
      clone: './src/practices/persist-with-rds/.test/assets/demo-repo-config-schema',
      symlink: DECLARATIONS_SYMLINKS,
    });

    when('[t0] the configs and the schema are applied, then applied again', () => {
      const scene = useBeforeAll(async () => {
        await applyConfigAndSchema({ tempDir });
        const once = await readAll({ tempDir });
        await applyConfigAndSchema({ tempDir });
        const twice = await readAll({ tempDir });
        return { once, twice };
      });

      then('each config parses under schema.apply', () => {
        expect(getAllParseOutcomes(scene.once)).toEqual(
          ENVS.map((env) => ({ env, success: true, error: undefined })),
        );
      });

      then('the tunnel cluster name is the rds cluster, not the db name', () => {
        for (const env of ['prep', 'prod'] as const) {
          const config = JSON.parse(scene.once.configs[env]!);
          expect(config.database.tunnel.cluster).toEqual({ name: 'awesomesdb' });
          expect(config.database.tunnel.bastion).toEqual({
            exid: 'vpc-main-bastion',
          });
        }
      });

      then('prep and prod tunnel on distinct local ports, test on localhost (#519)', () => {
        const portOf = (env: string) =>
          JSON.parse(scene.once.configs[env]!).database.tunnel.local.port;
        expect(portOf('prep')).not.toEqual(portOf('prod'));
        expect(
          JSON.parse(scene.once.configs.test!).database.tunnel.local.host,
        ).toEqual('localhost');
      });

      then('a second apply changes no byte', () => {
        expect(scene.twice).toEqual(scene.once);
      });

      then('the configs match snapshot', () => {
        for (const env of ENVS)
          expect(scene.once.configs[env]).toMatchSnapshot(
            `config/${env}.json — after`,
          );
      });
    });
  });

  given('[case2] a repo with hand-set values and legacy string tunnel fields', () => {
    const tempDir = genTempDir({
      slug: 'declapract-persist-with-rds-config-schema-handset',
      clone: './src/practices/persist-with-rds/.test/assets/demo-repo-config-schema',
      symlink: DECLARATIONS_SYMLINKS,
    });

    const BEFORE: Record<string, unknown> = {
      test: {
        organization: 'test-org',
        project: 'test-project',
        environment: { access: 'test' },
        aws: { account: '111111111111', namespace: 'testns' },
        featureFlags: { surfReport: true },
        database: {
          target: { database: 'testdb', schema: 'testdb' },
          pool: { max: 3 },
          role: {
            cicd: {
              'for-plan': { username: 'cicd_user', password: '__CHANG3_ME__' },
              'for-apply': { username: 'cicd_user', password: '__CHANG3_ME__' },
            },
            crud: { username: 'service_user', password: '__CHANG3_ME__' },
          },
          tunnel: {
            bastion: 'vpc-main-bastion',
            cluster: 'testdb',
            local: { host: 'localhost', port: 7821 },
            lambda: null,
          },
        },
      },
      prep: {
        organization: 'test-org',
        project: 'test-project',
        environment: { access: 'prep' },
        aws: { account: '111111111111', namespace: 'testns' },
        featureFlags: { surfReport: true },
        database: {
          target: { database: 'testdb', schema: 'testdb' },
          pool: { max: 3 },
          role: {
            cicd: {
              'for-plan': {
                username: 'cicd_user',
                password: '$.at(aws::param/test-org/test-project/prep/legacy.plan)',
              },
              'for-apply': {
                username: 'cicd_user',
                password: '$.at(aws::param)',
              },
            },
            crud: { username: 'service_user', password: '__CHANG3_ME__' },
          },
          tunnel: {
            bastion: { exid: 'vpc-main-bastion' },
            cluster: { name: 'hand-set-cluster' },
            local: { host: 'localhost', port: 15432 },
            lambda: { host: 'cluster.prep.example.com', port: 5432 },
          },
        },
      },
      prod: {
        organization: 'test-org',
        project: 'test-project',
        environment: { access: 'prod' },
        aws: { account: '222222222222', namespace: 'testns' },
        featureFlags: { surfReport: true },
        database: {
          target: { database: 'testdb', schema: 'testdb' },
          pool: { max: 3 },
          role: {
            cicd: {
              'for-plan': { username: 'cicd_user', password: '$.at(aws::param)' },
              'for-apply': { username: 'cicd_user', password: '$.at(aws::param)' },
            },
            crud: { username: 'service_user', password: '$.at(aws::param)' },
          },
          tunnel: {
            bastion: 'vpc-main-bastion',
            cluster: 'testdb',
            local: { host: 'localhost', port: 15433 },
            lambda: { host: 'cluster.prod.example.com', port: 5432 },
          },
        },
      },
    };

    when('[t0] the configs and the schema are applied, then applied again', () => {
      const scene = useBeforeAll(async () => {
        await fs.mkdir(path.join(tempDir, 'config'), { recursive: true });
        for (const env of ENVS)
          await fs.writeFile(
            path.join(tempDir, `config/${env}.json`),
            `${JSON.stringify(BEFORE[env], null, 2)}\n`,
          );
        const beforeConfigs: Record<string, string> = {};
        for (const env of ENVS)
          beforeConfigs[env] = await fs.readFile(
            path.join(tempDir, `config/${env}.json`),
            'utf-8',
          );
        await applyConfigAndSchema({ tempDir });
        const once = await readAll({ tempDir });
        await applyConfigAndSchema({ tempDir });
        const twice = await readAll({ tempDir });
        return { before: beforeConfigs, once, twice };
      });

      then('each config parses under schema.apply', () => {
        expect(getAllParseOutcomes(scene.once)).toEqual(
          ENVS.map((env) => ({ env, success: true, error: undefined })),
        );
      });

      then('the repo own keys and hand-set values survive', () => {
        const test = JSON.parse(scene.once.configs.test!);
        const prep = JSON.parse(scene.once.configs.prep!);
        expect(test.featureFlags).toEqual({ surfReport: true });
        expect(prep.database.pool).toEqual({ max: 3 });
        expect(prep.database.tunnel.cluster).toEqual({ name: 'hand-set-cluster' });
        expect(prep.database.role.cicd['for-plan'].password).toEqual(
          '$.at(aws::param/test-org/test-project/prep/legacy.plan)',
        );
        expect(prep.database.role.crud.password).toEqual('__CHANG3_ME__');
      });

      then('the legacy string tunnel fields are replaced', () => {
        const test = JSON.parse(scene.once.configs.test!);
        const prod = JSON.parse(scene.once.configs.prod!);
        for (const config of [test, prod]) {
          expect(config.database.tunnel.bastion).toEqual({
            exid: 'vpc-main-bastion',
          });
          expect(config.database.tunnel.cluster).toEqual({ name: 'awesomesdb' });
        }
      });

      then('each config carries the unmigrated-param-paths marker, paths kept (#544)', () => {
        for (const env of ENVS)
          expect(
            JSON.parse(scene.once.configs[env]!)['@declapract:review'],
          ).toContain('#544');
      });

      then('a second apply changes no byte', () => {
        expect(scene.twice).toEqual(scene.once);
      });

      then('before and after match snapshot', () => {
        for (const env of ENVS) {
          expect(scene.before[env]).toMatchSnapshot(`config/${env}.json — before`);
          expect(scene.once.configs[env]).toMatchSnapshot(
            `config/${env}.json — after`,
          );
        }
      });
    });
  });
});
