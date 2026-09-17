import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps #598: the two node suite configs COMPOSE the livedb wake with autoprune in ONE
 *         globalSetup, in the right order, forward globalConfig -- and useWakeOfLivedb self-gates
 *         so a service that reaches no cluster is a no-op.
 * .why  = a gateway/fan-out service owns no db but invokes peers that query the shared prep
 *         aurora-serverless cluster; at min-capacity 0 the cluster auto-pauses, so the first query
 *         cold-starts past the 90s timeout and flakes the suite. the fix wakes the cluster before
 *         the suite runs. jest allows ONE globalSetup, so the wake must COMPOSE with test-fns
 *         autoprune (which also needs that hook) -- never REPLACE it. the trap the downstream
 *         hand-fix fell into: `globalSetup: './jest.acceptance.prepare.ts'` that called only
 *         the wake, a silent drop of autoprune (the #590 half-wired state). this clamp forbids
 *         that: the composite must reach BOTH, wake FIRST, and forward globalConfig to autoprune
 *         (test-fns reads its globalTeardown slot; a dropped arg falsely accuses a wired consumer).
 * .teeth = drop the useWakeOfLivedb call, the autoprune forward, or the order from a composite and
 *          the matched case reddens; weaken a useWakeOfLivedb self-gate (CI / prod / tunnel) and its
 *          case reddens.
 * .note = subject is the shipped TEMPLATE text, read as a string. this file sits at the PRACTICE
 *         root (not under `best-practice/`), so declapract's loader — which walks only
 *         `best-practice/` for templates — never reads it as a declaration and never copies it to a
 *         consumer (`define.declapract-test-files`). that is why a source-text clamp lives here
 *         rather than collocated: it spans SEVERAL files, so it is not a single-file clamp.
 */

// anchor on __dirname, not process.cwd(): a nested `jest src/practices/...` run has a different
// cwd, and a repo-root-relative path under process.cwd() would then miss the tree (vacuous green).
const P = join(__dirname, 'best-practice');

const read = (rel: string): string => readFileSync(join(P, rel), 'utf8');

const composites = [
  { config: 'jest.integration.config.ts', setup: 'jest.integration.prepare.ts' },
  { config: 'jest.acceptance.config.ts', setup: 'jest.acceptance.prepare.ts' },
];

describe('#598 livedb-wake composite globalSetup', () => {
  for (const { config, setup } of composites) {
    given(`[case] ${setup}`, () => {
      const setupContents = read(setup);
      const configContents = read(config);

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

        then('it awaits useWakeOfLivedb (resume the cluster)', () => {
          expect(setupContents).toContain('await useWakeOfLivedb(');
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
      });
    });
  }

  given('[case] useWakeOfLivedb.ts self-gates', () => {
    const wakeContents = read('src/.test/useWakeOfLivedb.ts');

    when('[t0] the wake util is read', () => {
      then('it skips in ci (ci wakes via the dedicated workflow step)', () => {
        expect(wakeContents).toContain('process.env.CI');
      });

      then('it skips prod (prod never scales to 0)', () => {
        expect(wakeContents).toContain("=== 'prod'");
      });

      then('it gates on a declared db tunnel (the reaches-cluster signal)', () => {
        expect(wakeContents).toContain('.database?.tunnel');
      });

      then('it wakes via the rhx use.rds.capacity skill', () => {
        expect(wakeContents).toContain('rhx use.rds.capacity --env');
      });

      then('a present-but-unparseable config fails loud, never a silent false (rule.forbid.failhide)', () => {
        // a config the consumer authored but the setup cannot parse is a real defect, not "no
        // cluster" — it throws a ConstraintError that names the file, rather than a silent false
        // that conflates a broken config with an absent tunnel.
        // teeth: silent-false the catch (drop the throw) and both substrings vanish → reddens.
        expect(wakeContents).toContain('ConstraintError');
        expect(wakeContents).toContain('could not parse');
      });

      then('the read-parse-decide is a named transformer, not inline in the wake (rule.require.named-transformers)', () => {
        // the neighbor-config read + tunnel decision is one named intent, so the wake orchestrator
        // reads what-not-how. teeth: inline the parse back into useWakeOfLivedb and this reddens.
        expect(wakeContents).toContain('asReachesSharedClusterFromConfig');
      });
    });
  });
});
