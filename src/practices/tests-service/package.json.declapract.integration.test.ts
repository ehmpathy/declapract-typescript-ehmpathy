import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, getError, given, then, useBeforeAll, when } from 'test-fns';

// executeApply is slow (full usecase evaluation), so widen the jest budget
jest.setTimeout(180_000); // 3 minutes

/**
 * .what = end-to-end proof of the #598 wake-command gate, run through the REAL declapract apply
 *   pipeline against a genTempDir consumer. per `rule.require.declapract-integration-tests`, a
 *   `contents` fn that READS A NEIGHBOR FILE (here, the consumer's config/prep.json) is REQUIRED to
 *   carry a pipeline test — a unit test of the exported `contents` never exercises the glob→file
 *   match, the `getProjectRootDirectory()` resolution against the real consumer root, nor the
 *   emitted package.json a consumer actually receives.
 * .why = the declaration emits `start:livedb:prep` only when the consumer declares a db tunnel in
 *   its own config/prep.json (the signal it REACHES the shared aurora-serverless cluster — owns the
 *   db, or invokes peers that query it). only a real apply proves declapract (1) matches the
 *   declaration to `package.json`, (2) reads the neighbor config via `getProjectRootDirectory()`,
 *   (3) EMITS the wake command for a tunnel consumer, and (4) STRIPS it for a no-tunnel one — so a
 *   pure-compute lambda's cicd `start:livedb:prep --if-present` step stays a no-op rather than fires
 *   `rhx use.rds.capacity` against a cluster it does not use (which, with no swallow in the step,
 *   could fail the job). that is the exact #598 end-state the gate delivers.
 * .note = the apply is scoped by `file` ONLY, never by `practice` — a file-only apply keeps every
 *   usecase practice in `projectPractices` while it applies just the package.json plan (per the
 *   cicd-service provision.yml exemplar). the fixture symlinks a lean `declarations/` MIRROR that
 *   carries only tests-service, so a file-only apply compiles 1 practice, not the real tree's ~40.
 * .note = the CONSUMER config/prep.json is WRITTEN into the tempDir per case (not a fixture file),
 *   so the same base fixture drives both branches — the test owns the discriminant the gate reads.
 * .note = the emitted package.json is snapshotted in full (both branches), per the rule.
 */

const FIXTURE = './src/practices/tests-service/.test/assets/demo-repo-service';
const DECLARATIONS_MIRROR = './src/.test/assets/tests-service/declarations';
const WAKE_COMMAND = 'rhx use.rds.capacity --env prep';

const TUNNEL_CONFIG = {
  environment: { access: 'prep' },
  database: {
    tunnel: {
      bastion: 'vpc-main-bastion',
      lambda: { host: 'cluster.prep.example.com', port: 5432 },
    },
  },
};
const NO_TUNNEL_CONFIG = {
  environment: { access: 'prep' },
};

describe('tests-service package.json — the #598 wake-command gate, end to end', () => {
  given('[case1] a consumer that reaches the shared cluster (tunnel declared)', () => {
    const tempDir = genTempDir({
      slug: 'declapract-tests-service-wake-tunnel',
      clone: FIXTURE,
      symlink: [
        { at: 'declarations', to: DECLARATIONS_MIRROR },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (rel: string) => fs.readFile(path.join(tempDir, rel), 'utf-8');
    const applyPackageJson = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: 'package.json',
      });

    const state = useBeforeAll(async () => {
      // the consumer declares a db tunnel — the signal it reaches the shared cluster
      await fs.mkdir(path.join(tempDir, 'config'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'config', 'prep.json'),
        `${JSON.stringify(TUNNEL_CONFIG, null, 2)}\n`,
      );
      await applyPackageJson();
      const after1 = await read('package.json');
      await applyPackageJson(); // second apply — prove a fixed point
      const after2 = await read('package.json');
      return { after1, after2 };
    }, 170_000);

    when('[t0] the tests-service package.json declaration is applied', () => {
      then('the emitted package.json holds the wake command', () => {
        const pkg = JSON.parse(state.after1);
        expect(pkg.scripts?.['start:livedb:prep']).toEqual(WAKE_COMMAND);
      });

      then('the emitted package.json matches snapshot', () => {
        expect(state.after1).toMatchSnapshot(
          'package.json — tunnel consumer (wake command emitted)',
        );
      });
    });

    when('[t1] the declaration is applied a second time', () => {
      // idempotency is scoped to THIS fix's output — the scripts block. the devDependency's
      // `@declapract{check.minVersion(...)}` token resolves to a concrete version across the two
      // applies (a declapract minVersion-on-absent-dep behavior shared by every package.json
      // practice, not introduced by #598), so a whole-file equality would assert a property
      // declapract does not provide. the wake command this fix emits IS a fixed point.
      then('the emitted scripts block is a fixed point (idempotent)', () => {
        expect(JSON.parse(state.after2).scripts).toEqual(
          JSON.parse(state.after1).scripts,
        );
      });
    });
  });

  given('[case2] a consumer that reaches NO cluster (no tunnel declared)', () => {
    const tempDir = genTempDir({
      slug: 'declapract-tests-service-wake-notunnel',
      clone: FIXTURE,
      symlink: [
        { at: 'declarations', to: DECLARATIONS_MIRROR },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (rel: string) => fs.readFile(path.join(tempDir, rel), 'utf-8');
    const applyPackageJson = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: 'package.json',
      });

    const state = useBeforeAll(async () => {
      // the consumer declares NO db tunnel — a pure-compute lambda that reaches no cluster
      await fs.mkdir(path.join(tempDir, 'config'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'config', 'prep.json'),
        `${JSON.stringify(NO_TUNNEL_CONFIG, null, 2)}\n`,
      );
      await applyPackageJson();
      const after1 = await read('package.json');
      await applyPackageJson(); // second apply — prove a fixed point
      const after2 = await read('package.json');
      return { after1, after2 };
    }, 170_000);

    when('[t0] the tests-service package.json declaration is applied', () => {
      then('the emitted package.json STRIPS the wake command', () => {
        const pkg = JSON.parse(state.after1);
        expect(pkg.scripts?.['start:livedb:prep']).toBeUndefined();
      });

      then('the emitted package.json matches snapshot (the stripped shape)', () => {
        expect(state.after1).toMatchSnapshot(
          'package.json — no-tunnel consumer (wake command stripped)',
        );
      });
    });

    when('[t1] the declaration is applied a second time', () => {
      // scoped to this fix's output (see [case1] [t1] note); the strip is a fixed point — the
      // wake command stays absent across applies.
      then('the emitted scripts block stays absent (idempotent)', () => {
        expect(JSON.parse(state.after2).scripts).toEqual(
          JSON.parse(state.after1).scripts,
        );
      });
    });
  });

  given('[case3] a consumer whose config/prep.json is present but unparseable', () => {
    // the failhide clamp (r6 n2): a PRESENT-yet-broken config must FAIL LOUD, never be conflated
    // with a no-tunnel consumer. teeth: with the old `catch { return false }`, this apply RESOLVED
    // and stripped the wake command (a malformed config read as "no cluster"); with the rethrow,
    // the apply REJECTS and names the file. revert the try/catch to a silent false and this reddens.
    const tempDir = genTempDir({
      slug: 'declapract-tests-service-wake-broken',
      clone: FIXTURE,
      symlink: [
        { at: 'declarations', to: DECLARATIONS_MIRROR },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const applyPackageJson = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: 'package.json',
      });

    const state = useBeforeAll(async () => {
      // the consumer wrote a config the build cannot parse (a real defect, not "no cluster")
      await fs.mkdir(path.join(tempDir, 'config'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'config', 'prep.json'),
        '{ "database": { "tunnel": ', // truncated JSON — a real author defect
      );
      const error = await getError(applyPackageJson());
      return { error };
    }, 170_000);

    when('[t0] the tests-service package.json declaration is applied', () => {
      then('the apply FAILS LOUD, and names the malformed config to fix', () => {
        expect(state.error).toBeDefined();
        expect(state.error.message).toContain('could not parse');
        expect(state.error.message).toContain('config/prep.json');
      });
    });
  });
});
