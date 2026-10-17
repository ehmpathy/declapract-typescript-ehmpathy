import fs from 'fs/promises';
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { executeApply } from 'declapract';
import { MalfunctionError } from 'helpful-errors';
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

      then('the ancient release refuses a dirty tree before it builds, so COMMIT names the shipped code (#668)', () => {
        const ancient = scene.scripts['deploy:release:ancient']!;
        expect(ancient).toContain('npm run deploy:assure:committed');
        expect(ancient.indexOf('npm run deploy:assure:committed')).toBeLessThan(
          ancient.indexOf('npm run build'),
        );
        expect(scene.scripts['deploy:assure:committed']).toContain(
          'git status --porcelain',
        );
      });
    });

    when('[t1] the dirty-tree guard runs in a real git repo (#668)', () => {
      const runGuard = (input: { dirty: boolean }) => {
        const repo = genTempDir({ slug: `declapract-serverless-dirty-${input.dirty}` });
        execSync('git init -q && git -c user.email=t@example.com -c user.name=t commit -q --allow-empty -m init', { cwd: repo });
        if (input.dirty) writeFileSync(path.join(repo, 'edit.ts'), 'export {};\n');
        const result = spawnSync('sh', ['-c', scene.scripts['deploy:assure:committed']!], {
          cwd: repo,
          encoding: 'utf-8',
        });
        return { status: result.status, output: `${result.stdout}${result.stderr}` };
      };

      then('a clean tree passes', () => {
        expect(runGuard({ dirty: false }).status).toEqual(0);
      });

      then('a dirty tree exits 2 and says why', () => {
        const result = runGuard({ dirty: true });
        expect(result.status).toEqual(2);
        expect(result.output).toContain('uncommitted');
      });
    });

    when('[t2] the runtime gate is read (#553)', () => {
      then('the ancient release loads the built artifact on the deploy runtime before it ships', () => {
        const ancient = scene.scripts['deploy:release:ancient']!;
        expect(ancient.indexOf('npm run build')).toBeLessThan(
          ancient.indexOf('npm run test:runtime'),
        );
        expect(ancient.indexOf('npm run test:runtime')).toBeLessThan(
          ancient.indexOf('sls deploy'),
        );
      });
    });

    when('[t3] the runtime gate runs against a fake docker (#553)', () => {
      /**
       * .what = run `test:runtime` in a temp repo with a fake `docker` first on PATH
       * .why  = proves the preflight + the image the gate picks, with no daemon in this suite.
       *         the fake prints its args on `run`, and answers `info` per `daemon`.
       */
      const runGate = (input: { daemon: boolean; runtime: string | null }) => {
        const repo = genTempDir({
          slug: `declapract-serverless-runtime-${input.daemon}-${input.runtime}`,
        });
        mkdirSync(path.join(repo, 'bin'));
        writeFileSync(
          path.join(repo, 'bin', 'docker'),
          `#!/bin/sh\nif [ "$1" = info ]; then exit ${input.daemon ? 0 : 1}; fi\necho "docker $*"\n`,
          { mode: 0o755 },
        );
        writeFileSync(
          path.join(repo, 'serverless.yml'),
          input.runtime ? `provider:\n  runtime: ${input.runtime}\n` : 'provider:\n',
        );
        const result = spawnSync('sh', ['-c', scene.scripts['test:runtime']!], {
          cwd: repo,
          encoding: 'utf-8',
          env: { ...process.env, PATH: `${path.join(repo, 'bin')}:${process.env.PATH}` },
        });
        return { status: result.status, output: `${result.stdout}${result.stderr}` };
      };

      then('it runs the artifact in the lambda image of the serverless.yml major', () => {
        const result = runGate({ daemon: true, runtime: 'nodejs20.x' });
        expect(result.status).toEqual(0);
        expect(result.output).toContain('public.ecr.aws/lambda/nodejs:20');
        expect(result.output).toContain('/.artifact/contents:/var/task:ro');
      });

      then('no docker daemon exits 2 and names docker, never a fallback to the host node', () => {
        const result = runGate({ daemon: false, runtime: 'nodejs20.x' });
        expect(result.status).toEqual(2);
        expect(result.output).toContain('docker');
        expect(result.output).not.toContain('docker run');
      });

      then('a serverless.yml with no runtime fails before docker runs', () => {
        const result = runGate({ daemon: true, runtime: null });
        expect(result.status).not.toEqual(0);
        expect(result.output).not.toContain('docker run');
      });
    });

    when('[t4] the in-container load procedure runs over a built artifact (#553)', () => {
      /**
       * .what = run the in-container load procedure with the host node, over a temp artifact
       * .why  = the image is a fake above; this proves the procedure itself loads every handler
       *         and fails loud on one that cannot parse
       */
      const runLoad = (input: { handlers: Record<string, string> }) => {
        const artifact = genTempDir({
          slug: `declapract-serverless-load-${Object.keys(input.handlers).length}`,
        });
        mkdirSync(path.join(artifact, 'dist/contract/handlers/nested'), { recursive: true });
        Object.entries(input.handlers).forEach(([name, source]) =>
          writeFileSync(path.join(artifact, 'dist/contract/handlers', name), source),
        );
        // the load procedure is the single-quoted `node -e '<procedure>'` tail of `test:runtime`
        const loadProcedure =
          / -e '(?<procedure>.+)'$/.exec(scene.scripts['test:runtime'] ?? '')?.groups?.procedure ??
          MalfunctionError.throw('test:runtime holds no `-e` load procedure', {
            command: scene.scripts['test:runtime'] ?? null,
          });
        const result = spawnSync('node', ['-e', loadProcedure], {
          cwd: artifact,
          encoding: 'utf-8',
        });
        return { status: result.status, output: `${result.stdout}${result.stderr}` };
      };

      then('every handler, nested ones too, loads', () => {
        const result = runLoad({
          handlers: {
            'getWidget.js': 'exports.handler = async () => ({});\n',
            'nested/setWidget.js': 'exports.handler = async () => ({});\n',
          },
        });
        expect(result.status).toEqual(0);
        expect(result.output).toContain('2 handlers load on node');
      });

      then('a handler that cannot parse fails the gate', () => {
        const result = runLoad({
          handlers: { 'broken.js': 'exports.handler = ;\n' },
        });
        expect(result.status).not.toEqual(0);
        expect(result.output).toContain('SyntaxError');
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
 *         and mounts THIS repo's real `src` at `declarations` (never at `src`) so declapract resolves
 *         the serverless practice from source while the demo repo's own `src` stays empty — a `src`
 *         mount would make every `src/**` wildcard declaration scan the whole library.
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
      symlink: [{ at: 'declarations', to: 'src' }],
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

  given('[case2] a consumer whose .nvmrc pins node 20 (#552)', () => {
    const tempDir = genTempDir({
      slug: 'declapract-serverless-nvmrc',
      clone: './src/practices/serverless/.test/assets/demo-repo-with-serverless',
      symlink: [{ at: 'declarations', to: 'src' }],
    });
    const read = () => fs.readFile(path.join(tempDir, 'serverless.yml'), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'serverless',
        file: 'serverless.yml',
      });

    when('[t1] the serverless fix is applied', () => {
      useThen('pin .nvmrc, then apply', async () => {
        await fs.writeFile(path.join(tempDir, '.nvmrc'), 'v20.11.1\n');
        await applyFix();
      });

      then('the runtime follows .nvmrc, not the template major', async () => {
        const yml = await read();
        expect(yml).toContain('runtime: nodejs20.x');
        expect(yml).not.toContain('nodejs22.x');
        expect(yml).not.toContain('nodejs14.x');
      });

      then('a second apply is a no-op (the CONTAINS check passes on the derived runtime)', async () => {
        const before = await read();
        await applyFix();
        expect(await read()).toEqual(before);
      });
    });
  });

  given('[case3] a consumer whose .nvmrc names an alias, not a major (#552)', () => {
    const tempDir = genTempDir({
      slug: 'declapract-serverless-nvmrc-alias',
      clone: './src/practices/serverless/.test/assets/demo-repo-with-serverless',
      symlink: [{ at: 'declarations', to: 'src' }],
    });

    when('[t1] the serverless fix is applied', () => {
      const result = useThen('pin .nvmrc to an alias, then apply', async () => {
        await fs.writeFile(path.join(tempDir, '.nvmrc'), 'lts/*\n');
        const error = await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'serverless',
          file: 'serverless.yml',
        }).then(
          () => null,
          (thrown: unknown) => thrown,
        );
        const yml = await fs.readFile(path.join(tempDir, 'serverless.yml'), 'utf-8');
        return { error, yml };
      });

      then('the apply fails loud and names .nvmrc, rather than guess a major', () => {
        expect(result.error).toBeInstanceOf(Error);
        expect((result.error as Error).message).toContain('.nvmrc');
      });

      then('the runtime line is left as found', () => {
        expect(result.yml).toContain('nodejs14.x');
      });
    });
  });
});
