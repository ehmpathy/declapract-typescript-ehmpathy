import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps that every jest config template the tests-node / tests-expo practices ship
 *         REACHES both autoprune hooks -- never one without the other -- whether it wires the
 *         autoprune setup DIRECTLY or through a COMPOSITE globalSetup.
 * .why  = test-fns >=1.16 reclaims the temp dirs genTempDir makes, but jest needs TWO keys:
 *         globalSetup stamps the run, globalTeardown reclaims its dirs. a config with globalSetup
 *         and NO globalTeardown stamps every dir and reclaims none -- the half-wired state #590
 *         names, which test-fns itself detects + reports but the practice must never SHIP. the
 *         floor bump (tests-any package.json, test-fns >=1.17.0) delivers the capability; this
 *         clamp guards the wire-up so a future edit cannot drop one key and leave the other.
 * .why-composite = #598 makes the two node suite configs (integration + acceptance) COMPOSE an
 *         livedb wake with autoprune's setup, so their `globalSetup` points at a local
 *         `jest.<suite>.prepare.ts` rather than the `test-fns/autoprune.setup.jest` subpath
 *         directly. jest allows ONE globalSetup, so the composite is how both run. this clamp
 *         follows the indirection: a composite config still REACHES autoprune iff its globalSetup
 *         file imports the autoprune subpath. so a drop of the autoprune import from a composite
 *         reddens here exactly as a drop of the direct key would.
 * .teeth = remove `globalTeardown` from any config, OR remove the autoprune setup from a direct
 *          config, OR drop the `test-fns/autoprune.setup.jest` import from a composite globalSetup
 *          file, and the matched case reddens (the both-reached-together assertion).
 * .note = the subject is the shipped TEMPLATE text, read as a string -- so this clamp is
 *         independent of which test-fns version is installed here (the autoprune subpaths only
 *         need to load in a CONSUMER, which the floor bump guarantees). the `.declapract.test.ts`
 *         suffix is this repo's UNIT-test marker; declapract's loader excludes `.test.ts`, so this
 *         file is neither loaded as a declaration nor copied to a consumer.
 */

// a DIRECT config wires the setup as `globalSetup: 'test-fns/autoprune.setup.jest'`; a COMPOSITE
// file IMPORTS it as `... from 'test-fns/autoprune.setup.jest'`. the two forms are distinct on
// purpose: a `.why` comment may quote the `globalSetup: '...'` form as prose, so the composite
// reach-check matches the IMPORT form (`from '...'`), which a comment does not carry -- else a
// mere mention of the subpath in a comment would satisfy the clamp (a teeth hole caught in dogfood).
const SETUP_DIRECT_KEY = "globalSetup: 'test-fns/autoprune.setup.jest'";
const SETUP_IMPORT = "from 'test-fns/autoprune.setup.jest'";
const TEARDOWN_KEY = "globalTeardown: 'test-fns/autoprune.teardown.jest'";

// anchor on __dirname, not process.cwd(): the repo-root-relative paths below must point at the same
// file wherever jest is invoked from (a nested `jest src/practices/...` run has a different cwd).
// from this file (src/practices/tests-any/) the repo root is three segments up.
const REPO_ROOT = join(__dirname, '../../..');

// each config either wires the autoprune setup DIRECTLY, or COMPOSES it via a local globalSetup
// file that imports the autoprune subpath. `composite` names that file, relative to the practice.
const configs: { relPath: string; composite: string | null }[] = [
  { relPath: 'src/practices/tests-node/best-practice/jest.unit.config.ts', composite: null },
  {
    relPath: 'src/practices/tests-node/best-practice/jest.integration.config.ts',
    composite: 'src/practices/tests-node/best-practice/jest.integration.prepare.ts',
  },
  {
    relPath: 'src/practices/tests-node/best-practice/jest.acceptance.config.ts',
    composite: 'src/practices/tests-node/best-practice/jest.acceptance.prepare.ts',
  },
  { relPath: 'src/practices/tests-expo/best-practice/jest.unit.config.ts', composite: null },
  { relPath: 'src/practices/tests-expo/best-practice/jest.integration.config.ts', composite: null },
  { relPath: 'src/practices/tests-expo/best-practice/jest.acceptance.config.ts', composite: null },
];

/**
 * .what = whether a config REACHES the autoprune setup -- directly, or through its composite.
 * .why  = the invariant #590 guards is "setup is reached", not "setup is inline". a composite
 *         config reaches it iff its globalSetup file imports the autoprune subpath.
 */
const reachesAutopruneSetup = (input: {
  configContents: string;
  composite: string | null;
}): boolean => {
  // direct: the config itself wires `globalSetup: 'test-fns/autoprune.setup.jest'`
  if (input.configContents.includes(SETUP_DIRECT_KEY)) return true;

  // composite: the config points at a local globalSetup file that IMPORTS the autoprune subpath
  if (!input.composite) return false;
  const compositeContents = readFileSync(join(REPO_ROOT, input.composite), 'utf8');
  return compositeContents.includes(SETUP_IMPORT);
};

describe('autoprune hook reach across the shipped jest configs', () => {
  for (const { relPath, composite } of configs) {
    given(`[case] ${relPath}${composite ? ' (composite)' : ' (direct)'}`, () => {
      const configContents = readFileSync(join(REPO_ROOT, relPath), 'utf8');

      when('[t0] the shipped config is read', () => {
        then('it reaches the autoprune setup (stamps the run)', () => {
          expect(reachesAutopruneSetup({ configContents, composite })).toEqual(true);
        });

        then('it wires globalTeardown (reclaims the dirs)', () => {
          expect(configContents).toContain(TEARDOWN_KEY);
        });

        then('it never ships one hook without the other (half-wired = stamp, no reclaim)', () => {
          const reachesSetup = reachesAutopruneSetup({ configContents, composite });
          const hasTeardown = configContents.includes(TEARDOWN_KEY);
          expect(reachesSetup).toEqual(hasTeardown);
        });
      });
    });
  }
});
