import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the persist-with-rds `old-dev-config-location` relocate +
 *         tier-migrate, run through the REAL declapract apply pipeline against a genTempDir
 *         clone of a consumer repo (the row-4 clamp, rds declarer).
 * .why  = the config declarer has its own pipeline test; per
 *         `rule.require.declapract-integration-tests` EACH declarer that relocates a file AND
 *         transforms blocks owes its own end-to-end test — a unit test of the exported `fix`
 *         never exercises the glob→file match or the `relativeFilePath` rewrite. the rds
 *         declarer adds one transform the config twin lacks (`__CHANG3_ME__` → aws-param), so
 *         it needs its own clamp rather than a claim that the config test covers it.
 * .teeth = the input holds `"access": "dev"` (unambiguous → migrated to `prep`) plus four `.dev`
 *          hosts the util runs on in a CONSUMER's real config — a `://` URL `https://auth.myapp.dev`,
 *          a mid-dotted `bastion.dev.example.com`, a terminal `aws.ssmproxy.mydb.dev`, and a FOREIGN
 *          public host `api.dev.paypal.com` (paypal's own label). a `.dev` label is axis-ambiguous
 *          WHEREVER it sits, so per guard #3 EVERY host is preserved byte-for-byte — the after-state
 *          proves all four survive, that none flips to `.prep`, and that NO `@declapract:review`
 *          bytes ever enter the config. it also proves the rds-only `__CHANG3_ME__` → aws-param
 *          transform (the one the config twin lacks) plus the relocation.
 */
describe('persist-with-rds — old-dev-config-location relocate + tier-migrate (row-4 clamp)', () => {
  given('[case1] an rds repo with a config/dev.json to migrate', () => {
    const tempDir = genTempDir({
      slug: 'declapract-persist-with-rds-old-dev-config-location',
      clone: './src/practices/persist-with-rds/.test/assets/demo-repo-with-dev-config',
      symlink: [{ at: 'src', to: 'src' }],
    });

    const devPath = 'config/dev.json';
    const prepPath = 'config/prep.json';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const exists = async (relativePath: string): Promise<boolean> =>
      fs
        .access(path.join(tempDir, relativePath))
        .then(() => true)
        .catch(() => false);
    const applyMigrate = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'persist-with-rds',
        file: devPath,
      });

    when('[t0] the migration input (before any fix)', () => {
      then('config/dev.json holds the dev tier + the placeholder + matches snapshot', async () => {
        const before = await read(devPath);
        expect(before).toContain('"access": "dev"');
        expect(before).toContain('"__CHANG3_ME__"');
        expect(before).toMatchSnapshot('config/dev.json — before');
      });
    });

    when('[t1] the relocate + migrate fix is applied', () => {
      useThen('migrate the dev config', async () => applyMigrate());

      then(
        'config/prep.json now holds the migrated content + config/dev.json is gone + matches snapshot',
        async () => {
          // the relocation landed: the new path exists, the old path is unlinked
          expect(await exists(prepPath)).toBe(true);
          expect(await exists(devPath)).toBe(false);

          const after = await read(prepPath);
          // the access itself is the one unambiguous token → migrated
          expect(after).toContain('"access": "prep"');
          expect(after).not.toContain('"access": "dev"');
          // EVERY host survives byte-for-byte — a `.dev` label is axis-ambiguous WHEREVER it sits,
          // so per guard #3 the util rewrites NO host at all.
          expect(after).toContain('bastion.dev.example.com');
          expect(after).toContain('aws.ssmproxy.mydb.dev');
          expect(after).toContain('https://auth.myapp.dev');
          // the FOREIGN public host is the decisive corruption case: teeth — the prior mid-dotted
          // rewrite turned this into `api.prep.paypal.com`, a silent public-endpoint corruption.
          expect(after).toContain('api.dev.paypal.com');
          expect(after).not.toContain('api.prep.paypal.com');
          // no host was flipped to `.prep`, so no wrong-tier value ever enters the config
          expect(after).not.toContain('bastion.prep.example.com');
          expect(after).not.toContain('aws.ssmproxy.mydb.prep');
          // the migration never emits a value it cannot verify — no marker bytes in config
          expect(after).not.toContain('@declapract:review');
          // the rds-only placeholder → the aws-param reference (the transform the twin lacks)
          expect(after).toContain('"$.at(aws::param)"');
          expect(after).not.toContain('__CHANG3_ME__');
          // full content, for the reviewer's eye
          expect(after).toMatchSnapshot('config/prep.json — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // config/dev.json is gone after the first relocate, so the EXISTS check no longer
      // fires and no fix runs — config/prep.json must be untouched (per
      // rule.require.idempotent-fixes).
      const passes = useThen(
        'a second apply over the already-migrated repo',
        async () => {
          const before = await read(prepPath);
          await applyMigrate();
          const after = await read(prepPath);
          return { before, after };
        },
      );

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});

/**
 * .what = D55 clamp: `src/utils/config/getConfig.ts` has exactly ONE declarer — the `config`
 *         practice (the real sdk-config impl). `persist-with-rds` ships NO second copy of that
 *         path (the old `'placeholder' as any` typed lie).
 * .why  = `lambda-service-with-rds` extends `lambda-service`, which always supplies `config`, so the
 *         placeholder was dead weight whose correctness rested on alphabetical apply order
 *         (`config` < `persist-with-rds`). two declarers of one path, one a typed lie, is a silent
 *         hazard: a consumer converged to the real file only by accident of that order. one
 *         declarer removes both the order dependency and the lie — the consumer receives config's
 *         real getConfig at this exact path, so persist-with-rds's own import resolves.
 * .teeth = re-add a getConfig.ts under persist-with-rds/best-practice → the sole-declarer assertion
 *          reddens.
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads the filesystem (the
 *         practice trees). no credential, no network.
 */
describe('persist-with-rds — getConfig has a single declarer (D55 clamp)', () => {
  const configGetConfig =
    'src/practices/config/best-practice/src/utils/config/getConfig.ts';
  const rdsGetConfig =
    'src/practices/persist-with-rds/best-practice/src/utils/config/getConfig.ts';
  const rdsDbConnection =
    'src/practices/persist-with-rds/best-practice/src/utils/database/getOneDatabaseConnection.ts';
  const exists = async (relativePath: string): Promise<boolean> =>
    fs
      .access(relativePath)
      .then(() => true)
      .catch(() => false);

  given('[case1] the two practices that touch src/utils/config/getConfig.ts', () => {
    when('[t0] the declarers of that path are read', () => {
      then('the config practice is the sole declarer (real sdk-config impl)', async () => {
        expect(await exists(configGetConfig)).toBe(true);
        const real = await fs.readFile(configGetConfig, 'utf-8');
        expect(real).toContain("from 'sdk-config'");
        expect(real).not.toContain("'placeholder' as any");
      });

      then('persist-with-rds ships NO second copy (no typed-lie placeholder)', async () => {
        // teeth: re-add a getConfig.ts under persist-with-rds/best-practice and this reddens
        expect(await exists(rdsGetConfig)).toBe(false);
      });

      then('persist-with-rds imports getConfig from the config-supplied path', async () => {
        // the consumer receives config's real getConfig at this exact path, so the import resolves
        const dbConn = await fs.readFile(rdsDbConnection, 'utf-8');
        expect(dbConn).toContain("from '../config/getConfig'");
      });
    });
  });
});

/**
 * .what = config.schema.ts clamp: this path has TWO declarers BY DESIGN — `config` (the base
 *         shape, for a non-rds `lambda-service`) and `persist-with-rds` (the full shape with the
 *         database block, for `lambda-service-with-rds`). persist-with-rds declares its full schema
 *         as a PLAIN overwrite template (EQUALS), NOT a CONTAINS + regex-splice fix.
 * .why  = a CONTAINS+splice `fix` for this path was dead code: its regex anchored on `});` before
 *         `export type Config`, but config's base emits `} as const;` there, so on a fresh
 *         `lambda-service-with-rds` consumer the fix no-oped and the check stayed permanently red —
 *         no path to green via `declapract fix`. worse, its inline splice string was stale (flat
 *         `role.cicd.{username,password}` vs the real `for-plan`/`for-apply` split). the later
 *         declarer (persist-with-rds) shadows config's base for rds consumers, so removal of the
 *         `.declapract.ts` makes its full `config.schema.ts` a plain EQUALS overwrite (declapract's
 *         default with no companion) that always converges — rule.prefer.overwrite-over-mutate: do
 *         not pair an overwrite template with a separate splice fix for the same path.
 * .teeth = re-add a config.schema.ts.declapract.ts under persist-with-rds/best-practice → the
 *          "no splice-fix declarer" assertion reddens; strip the `for-plan` split from
 *          persist-with-rds's full schema → the "full schema declared" assertion reddens.
 * .note = INTEGRATION by rule.forbid.unit.remote-boundaries: reads the filesystem (practice trees).
 */
describe('persist-with-rds — config.schema.ts is a plain overwrite, not a splice-fix (config.schema clamp)', () => {
  const configSchema =
    'src/practices/config/best-practice/src/utils/config/config.schema.ts';
  const rdsSchema =
    'src/practices/persist-with-rds/best-practice/src/utils/config/config.schema.ts';
  const rdsSchemaFix =
    'src/practices/persist-with-rds/best-practice/src/utils/config/config.schema.ts.declapract.ts';
  const exists = async (relativePath: string): Promise<boolean> =>
    fs
      .access(relativePath)
      .then(() => true)
      .catch(() => false);

  given('[case1] the two by-design declarers of src/utils/config/config.schema.ts', () => {
    when('[t0] the declared files are read', () => {
      then('config declares the BASE shape (no database block) for a non-rds service', async () => {
        const base = await fs.readFile(configSchema, 'utf-8');
        expect(base).toContain('const base = z.object(');
        expect(base).not.toContain('database: z.object(');
      });

      then('persist-with-rds declares the FULL schema (database + for-plan/for-apply split)', async () => {
        // teeth: strip the for-plan split from the full schema and this reddens
        const full = await fs.readFile(rdsSchema, 'utf-8');
        expect(full).toContain('database: z.object(');
        expect(full).toContain("'for-plan': z.object(");
        expect(full).toContain("'for-apply': z.object(");
      });

      then('persist-with-rds ships NO CONTAINS+splice fix for that path (dead regex gone)', async () => {
        // teeth: re-add config.schema.ts.declapract.ts and this reddens. the paired full template
        // is a plain EQUALS overwrite, so a fresh rds consumer converges via overwrite, never a
        // splice that no-ops on config's `} as const;` base.
        expect(await exists(rdsSchemaFix)).toBe(false);
      });
    });
  });
});
