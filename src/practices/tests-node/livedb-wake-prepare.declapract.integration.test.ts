import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps #598: the suite configs COMPOSE the livedb wake with autoprune in ONE globalSetup,
 *         in the right order, forward globalConfig -- and useWakeOfLivedb self-gates so a service
 *         that reaches no cluster is a no-op. extends the clamp to #623 (keyrack sourced once per
 *         run, in the globalSetup, after the wake and before autoprune), #651 (the acceptance
 *         prepare names its access or stops), #675 (the acceptance env aligns CONFIG with ACCESS),
 *         and #621 (the expo configs wake via-gateway).
 * .why  = a gateway/fan-out service owns no db but invokes peers that query the shared prep
 *         aurora-serverless cluster; at min-capacity 0 the cluster auto-pauses, so the first query
 *         cold-starts past the 90s timeout and flakes the suite. jest allows ONE globalSetup, so the
 *         wake must COMPOSE with test-fns autoprune -- never REPLACE it. keyrack moves into the same
 *         hook so it is sourced once per run, not once per suite file (~25s each).
 * .teeth = drop the useWakeOfLivedb call, the keyrack call, the autoprune forward, or the order from
 *          a composite and the matched case reddens; put useKeyrack back in an env file and the
 *          env case reddens; drop the CONFIG alignment and the acceptance env case reddens.
 * .note = subject is the shipped TEMPLATE text, read as a string. this file sits at the PRACTICE
 *         root (not under `best-practice/`), so declapract's loader never reads it as a declaration
 *         (`define.declapract-test-files`). it spans several practices' files, so it is not a
 *         single-file clamp.
 */

// anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different
// cwd, and a repo-root-relative path under process.cwd() would then miss the tree (vacuous green).
const NODE = join(__dirname, 'best-practice');
const EXPO = join(__dirname, '..', 'tests-expo', 'best-practice');
const ANY = join(__dirname, '..', 'tests-any', 'best-practice');

const read = (dir: string, rel: string): string => readFileSync(join(dir, rel), 'utf8');

const composites = [
  {
    dir: NODE,
    config: 'jest.integration.config.ts',
    setup: 'jest.integration.prepare.ts',
    reaches: 'via-tunnel',
    keyrack: true,
  },
  {
    dir: NODE,
    config: 'jest.acceptance.config.ts',
    setup: 'jest.acceptance.prepare.ts',
    reaches: 'via-tunnel',
    keyrack: true,
  },
  {
    dir: EXPO,
    config: 'jest.integration.config.ts',
    setup: 'jest.integration.prepare.ts',
    reaches: 'via-gateway',
    keyrack: false,
  },
  {
    dir: EXPO,
    config: 'jest.acceptance.config.ts',
    setup: 'jest.acceptance.prepare.ts',
    reaches: 'via-gateway',
    keyrack: false,
  },
];

describe('#598 livedb-wake composite globalSetup', () => {
  for (const { dir, config, setup, reaches, keyrack } of composites) {
    const label = dir === NODE ? 'tests-node' : 'tests-expo';
    given(`[case] ${label} ${setup}`, () => {
      const setupContents = read(dir, setup);
      const configContents = read(dir, config);

      when('[t0] the config is read', () => {
        then(`it points globalSetup at ./${setup}`, () => {
          expect(configContents).toContain(`globalSetup: './${setup}'`);
        });
      });

      when('[t1] the composite globalSetup is read', () => {
        then('it imports useWakeOfLivedb by RELATIVE path (not the @src alias)', () => {
          // a globalSetup loads before jest moduleNameMapper, so @src fails at startup
          expect(setupContents).toContain("from './src/.test/useWakeOfLivedb'");
        });

        then(`it awaits useWakeOfLivedb ${reaches}`, () => {
          expect(setupContents).toContain('await useWakeOfLivedb(');
          expect(setupContents).toContain(`reaches: '${reaches}'`);
        });

        then('it forwards globalConfig to the autoprune setup', () => {
          expect(setupContents).toContain('await autopruneSetup(globalConfig)');
        });

        then('it wakes BEFORE autoprune mints the run id (order)', () => {
          const wakeAt = setupContents.indexOf('await useWakeOfLivedb(');
          const pruneAt = setupContents.indexOf('await autopruneSetup(');
          expect(wakeAt).toBeGreaterThanOrEqual(0);
          expect(pruneAt).toBeGreaterThan(wakeAt);
        });

        if (keyrack)
          then('it sources keyrack once, after the wake and before autoprune (#623)', () => {
            expect(setupContents).toContain("from './src/.test/useKeyrack'");
            const wakeAt = setupContents.indexOf('await useWakeOfLivedb(');
            const keyrackAt = setupContents.indexOf('useKeyrack(');
            const pruneAt = setupContents.indexOf('await autopruneSetup(');
            expect(keyrackAt).toBeGreaterThan(wakeAt);
            expect(pruneAt).toBeGreaterThan(keyrackAt);
          });
      });
    });
  }

  given('[case] the tests-node acceptance prepare names its access (#651)', () => {
    const setupContents = read(NODE, 'jest.acceptance.prepare.ts');

    then('it derives the keyrack env via getOneKeyrackEnvForAcceptance, never a silent default', () => {
      expect(setupContents).toContain('getOneKeyrackEnvForAcceptance({ env: process.env })');
      expect(setupContents).not.toContain("?? 'test'");
    });

    then('it sources keyrack strict', () => {
      expect(setupContents).toContain("mode: 'strict'");
    });
  });

  given('[case] the tests-node env files no longer source keyrack per suite file (#623)', () => {
    for (const envFile of ['jest.integration.env.ts', 'jest.acceptance.env.ts'])
      then(`${envFile} holds no useKeyrack call`, () => {
        expect(read(NODE, envFile)).not.toContain('useKeyrack(');
      });
  });

  given('[case] the tests-node acceptance env aligns CONFIG with ACCESS (#675)', () => {
    const envContents = read(NODE, 'jest.acceptance.env.ts');

    then('it sets ACCESS and CONFIG to one value', () => {
      expect(envContents).toContain("const access = process.env.ACCESS ?? 'test';");
      expect(envContents).toContain('process.env.ACCESS = access;');
      expect(envContents).toContain('process.env.CONFIG = access;');
    });

    /**
     * .what = run the template's alignment lines, then derive config through the real sdk-environment
     * .why  = the string checks above prove the lines ship; this proves they WORK under jest's forced
     *         NODE_ENV=test — sdk-environment reads CONFIG before NODE_ENV, and a change of that
     *         order upstream would turn this red rather than ship a prep run on test config
     */
    const getOneConfigDerived = (input: { access: string; aligned: boolean }) => {
      const alignment = input.aligned
        ? "const access = process.env.ACCESS ?? 'test'; process.env.ACCESS = access; process.env.CONFIG = access;"
        : '';
      const { CONFIG: _config, ...envBase } = process.env;
      // look up the path here, so the child loads this repo's pinned copy (and depcheck sees the dep)
      const sdkEnvironmentPath = require.resolve('sdk-environment');
      const result = spawnSync(
        'node',
        [
          '-e',
          `${alignment} const { getEnvironment } = require(${JSON.stringify(sdkEnvironmentPath)}); process.stdout.write(String(getEnvironment.static().config));`,
        ],
        {
          encoding: 'utf-8',
          env: { ...envBase, NODE_ENV: 'test', ACCESS: input.access },
        },
      );
      return { status: result.status, config: result.stdout, stderr: result.stderr };
    };

    when('[t0] a cloud run with ACCESS=prep derives its config under NODE_ENV=test', () => {
      then('the aligned env derives config prep', () => {
        const result = getOneConfigDerived({ access: 'prep', aligned: true });
        expect(result.stderr).toEqual('');
        expect(result.config).toEqual('prep');
      });

      then('the unaligned env derives config test — the #675 defect the alignment closes', () => {
        expect(getOneConfigDerived({ access: 'prep', aligned: false }).config).toEqual('test');
      });
    });
  });

  given('[case] useWakeOfLivedb.ts self-gates', () => {
    const wakeContents = read(ANY, 'src/.test/useWakeOfLivedb.ts');

    when('[t0] the wake util is read', () => {
      then('it skips in ci (ci wakes via the dedicated workflow step)', () => {
        expect(wakeContents).toContain('process.env.CI');
      });

      then('it skips prod (prod never scales to 0)', () => {
        expect(wakeContents).toContain("=== 'prod'");
      });

      then('it gates a via-tunnel caller on a declared db tunnel (the reaches-cluster signal)', () => {
        expect(wakeContents).toContain('.database?.tunnel');
      });

      then('it wakes via the rhx use.rds.capacity skill', () => {
        expect(wakeContents).toContain('rhx use.rds.capacity --env');
      });

      then('a present-but-unparseable config fails loud, never a silent false (rule.forbid.failhide)', () => {
        expect(wakeContents).toContain('ConstraintError');
        expect(wakeContents).toContain('could not parse');
      });

      then('the read-parse-decide is a named transformer, not inline in the wake (rule.require.named-transformers)', () => {
        expect(wakeContents).toContain('asReachesSharedClusterFromConfig');
      });

      then('the wake decision is a named, exported transformer (#621)', () => {
        expect(wakeContents).toContain('export const getWakeDecision');
      });
    });
  });
});
