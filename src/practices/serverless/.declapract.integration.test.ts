import fs from 'fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

jest.setTimeout(180_000);

/**
 * .what = holds the serverless `package.json` deploy commands to the dual-publish split —
 *         the council-gated fulcrum that a wrong guess would ship as a permanent 2×-deploy.
 * .why  = the `package.json` is a CONTAINS template with no `fix`, so no unit test covers it.
 *         per `rule.require.clamp-edge-cases`, the deploy-split (and the contemp prune it needs)
 *         owes a clamp. this reads the template + pins the split shape.
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads the filesystem (the
 *         template file). no credential, no network.
 * .teeth = (a) `deploy:release` MUST invoke BOTH halves — a revert to a single-fleet release
 *          reddens it; (b) `deploy:prune` MUST also prune the contemp `-prep-` fleet — a revert
 *          to the ancient-only prune (the B1 leak) reddens it.
 */

const PACKAGE_JSON_PATH = `${__dirname}/best-practice/package.json`;
const SERVERLESS_YML_PATH = `${__dirname}/best-practice/serverless.yml`;

describe('serverless practice — the dual-publish deploy split (north-star clamp)', () => {
  given('[case1] the shipped serverless package.json template', () => {
    const scene = useBeforeAll(() => ({
      scripts: JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')).scripts as Record<
        string,
        string
      >,
    }));

    when('[t0] the deploy commands are read', () => {
      then('the ancient release publishes the dev-below-prod slug', () => {
        expect(scene.scripts['deploy:release:ancient']).toContain(
          "[ \"${ACCESS:-}\" = 'prep' ] && echo 'dev'",
        );
        expect(scene.scripts['deploy:release:ancient']).toContain(
          '--stage "${SLS_STAGE:-}"',
        );
      });

      then('the contemp release publishes the prep slug', () => {
        expect(scene.scripts['deploy:release:contemp']).toContain('--stage prep');
      });

      then('deploy:release runs BOTH fleets (the dual-publish teeth)', () => {
        expect(scene.scripts['deploy:release']).toContain(
          'npm run deploy:release:ancient',
        );
        expect(scene.scripts['deploy:release']).toContain(
          'npm run deploy:release:contemp',
        );
      });

      then('deploy:prod publishes the ancient fleet only (prod is prod on both axes)', () => {
        expect(scene.scripts['deploy:prod']).toContain(
          'npm run deploy:release:ancient',
        );
        expect(scene.scripts['deploy:prod']).not.toContain(
          'npm run deploy:release:contemp',
        );
      });

      then('deploy:prune also prunes the contemp -prep- fleet (the B1 leak clamp)', () => {
        expect(scene.scripts['deploy:prune']).toContain('--stage prep');
      });
    });
  });

  given('[case2] the shipped serverless.yml template', () => {
    const scene = useBeforeAll(() => ({
      yml: readFileSync(SERVERLESS_YML_PATH, 'utf8'),
    }));

    when('[t0] the domain-driven-cache IAM grant is read', () => {
      then('it grants the cache family with the stage segment globbed (#597)', () => {
        // the shared cache is one table addressed by a single name (below prod that name is -dev-);
        // a globbed grant covers -dev-, -prep-, -prod- in one line, so the contemp -prep- fleet's
        // -dev- cache read is authorized. supersedes the earlier D27 two-line stage+access grant.
        expect(scene.yml).toContain(
          'table/infrastructure-*-table-domain-driven-cache',
        );
      });

      then('no stage- or access-templated cache grant survives (the #597 teeth)', () => {
        // a templated grant covers only the deployed fleet's own slug — the exact #597 break where
        // the contemp -prep- fleet AccessDenied on the shared -dev- cache. the glob replaces both.
        expect(scene.yml).not.toContain(
          'table/infrastructure-${self:provider.stage}-table-domain-driven-cache',
        );
        expect(scene.yml).not.toContain(
          'table/infrastructure-${self:custom.access}-table-domain-driven-cache',
        );
      });

      then('the glue-db grants read the single hoisted custom.access var (D: no 4x dup)', () => {
        // teeth: the accessByStage lookup is declared ONCE, as custom.access; a partial edit that
        // re-inlined the lookup at one arn site (and missed another) is the D27-reopen hazard.
        expect(scene.yml).toContain(
          "access: ${self:custom.accessByStage.${opt:stage}, 'prep'}",
        );
        // exactly one occurrence of the raw accessByStage lookup — the hoisted var, nowhere else
        expect(
          (scene.yml.match(/accessByStage\.\$\{opt:stage\}/g) || []).length,
        ).toBe(1);
      });
    });

    when('[t1] the glue db + table IAM grants are read', () => {
      // the vision names the cache AND the glue db as the SAME stage/access disease (D27). the
      // cache dual-grant alone is a point-fix; the glue db + table owe the identical dual-grant, or
      // the ancient stack's access-keyed glue lookup 403s exactly the way the cache did.
      then('the glue db grants BOTH the stage-keyed and access-keyed name', () => {
        expect(scene.yml).toContain(
          'database/@declapract{variable.databaseName}_${self:provider.stage}',
        );
        // teeth: drop the access-keyed glue db grant and the glue instance of D27 reopens.
        expect(scene.yml).toContain(
          'database/@declapract{variable.databaseName}_${self:custom.access}',
        );
      });

      then('the glue table grants BOTH the stage-keyed and access-keyed name', () => {
        expect(scene.yml).toContain(
          'table/@declapract{variable.databaseName}_${self:provider.stage}/*',
        );
        // teeth: drop the access-keyed glue table grant and the glue instance of D27 reopens.
        expect(scene.yml).toContain(
          'table/@declapract{variable.databaseName}_${self:custom.access}/*',
        );
      });
    });
  });
});

/**
 * .what = end-to-end proof of the serverless.yml fix through the REAL declapract apply pipeline,
 *         run against a genTempDir clone of a legacy consumer repo.
 * .why  = serverless.yml.declapract.ts is a 17-transform fold of regex-over-structured-text
 *         rewrites — per rule.require.declapract-integration-tests a transform-blocks fix REQUIRES
 *         a test that runs the REAL executeApply, not a static template read. this proves what the
 *         unit suite cannot: the `.declapract.ts` companion matched to `best-practice/serverless.yml`,
 *         the file glob→match, the emitted file a consumer receives on disk, and a second-apply
 *         fixed point.
 * .note = INTEGRATION: reads the filesystem + runs executeApply against a temp clone. no credential,
 *         no network. the fixture lives under a `.test` dot-dir (excluded from tsconfig/jest globs),
 *         and mounts THIS repo's real `src` via the `src`→`src` symlink so declapract resolves the
 *         serverless practice from source.
 * .teeth = the env-block trio proves the CHAIN ORDER: withConnectionReuse anchors the legacy
 *          NODE_ENV form and MUST run before withNodeEnvProduction rewrites that value to
 *          `production`. so the presence of the connection-reuse flag beside a `NODE_ENV: production`
 *          line proves the order held — a reorder that ran the production rewrite first would erase
 *          the anchor and the flag would never land (the r007.b3 order-dependence clamp + the
 *          r001.b1 pipeline clamp in one).
 */
describe('serverless practice — the real executeApply pipeline (r001.b1)', () => {
  given('[case1] a legacy consumer serverless.yml (old runtime, legacy env block)', () => {
    const tempDir = genTempDir({
      slug: 'declapract-serverless-fix',
      clone: './src/practices/serverless/.test/assets/demo-repo-with-serverless',
      symlink: [{ at: 'src', to: 'src' }],
    });

    const ymlPath = 'serverless.yml';
    const read = () => fs.readFile(path.join(tempDir, ymlPath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'serverless',
        file: ymlPath,
      });

    when('[t0] the legacy input (before any fix)', () => {
      then('the serverless.yml input matches snapshot', async () => {
        expect(await read()).toMatchSnapshot('serverless.yml — before');
      });
    });

    when('[t1] the serverless fix is applied', () => {
      useThen('apply the serverless fix', async () => applyFix());

      then('the node runtime is bumped to the pinned major', async () => {
        const yml = await read();
        expect(yml).toContain('runtime: nodejs22.x');
        expect(yml).not.toContain('nodejs14.x');
      });

      then('the legacy NODE_ENV value is rewritten to production', async () => {
        const yml = await read();
        expect(yml).toContain('NODE_ENV: production');
        expect(yml).not.toContain('stageToNodeEnvMapping');
      });

      then('the connection-reuse flag lands beside the production NODE_ENV (chain-order teeth)', async () => {
        const yml = await read();
        // withConnectionReuse ran BEFORE withNodeEnvProduction: it anchored the legacy NODE_ENV form
        // and inserted the flag on the next line, then the production rewrite hit the same line. the
        // flag on the line after `NODE_ENV: production` proves the order held.
        expect(yml).toContain(
          'NODE_ENV: production # deploy with production optimizations of all resources, to make `prep` and `prod` stage deployments equivalent functionally (i.e., the same code paths in prep and prod)\n    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true',
        );
      });

      then('the utc timezone guard is inserted under the env block', async () => {
        const yml = await read();
        expect(yml).toContain('TZ: UTC # guarantee');
      });

      then('the emitted file matches snapshot', async () => {
        expect(await read()).toMatchSnapshot('serverless.yml — after');
      });
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      const passes = useThen('a second fix over its own output', async () => {
        const before = await read(); // post-first-fix
        await applyFix(); // second apply
        const after = await read();
        return { before, after };
      });

      then('the second fix is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
