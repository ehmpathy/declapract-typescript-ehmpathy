import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply is slow (full usecase evaluation), so widen the jest budget
jest.setTimeout(180_000); // 3 minutes

/**
 * .what = end-to-end proof of the D28 provision.yml rds-jobs gate, run through the REAL declapract
 *   apply pipeline against a genTempDir consumer. per `rule.require.declapract-integration-tests`, a
 *   `contents` fn that GENERATES a file from another source (the superset) is REQUIRED to carry a
 *   pipeline test — a unit test of the exported `contents`/`withoutRdsJobs` never exercises the
 *   glob→file match, the `projectPractices` derivation through a real usecase, nor the emitted file a
 *   consumer actually receives.
 * .why = the declaration branches on `context.projectPractices.includes('persist-with-rds')`. only a
 *   real apply proves declapract (1) matches the declaration to `.github/workflows/provision.yml`,
 *   (2) derives `projectPractices` from the resolved usecase (present for `lambda-service-with-rds`,
 *   absent for `lambda-service`), (3) CREATES the absent best-practice file, and (4) emits the
 *   superset for an rds consumer vs the narrowed workflow (4 rds jobs stripped) for a non-rds one —
 *   the exact D28/#573 end-state the gate exists to deliver.
 * .note = the apply is scoped by `file` ONLY, never by `practice`. a `--practice cicd-service` filter
 *   narrows `projectPractices` to `['cicd-service']` (getDesiredPractices), which would strip
 *   `persist-with-rds` from the derivation and silence the rds branch. file-only keeps every usecase
 *   practice in `projectPractices` while it applies just the provision.yml plan.
 * .note = because the apply is file-only (no `--practice` filter), declapract compiles EVERY practice
 *   under the config's `practices:` dir. pointed at the real `src/practices` (~40 practices) that
 *   blew the jest hook timeout, so the fixture symlinks a lean `declarations/` MIRROR that carries
 *   only cicd-service + a persist-with-rds name-marker — the exact pattern the environments
 *   old-stage-enum pipeline test uses. the mirror is the `src/.test/assets/cicd-service/declarations`
 *   symlink below; the demo-repo's use.yml points its `declarations:` at it.
 * .note = the emitted file is snapshotted in full (both usecases) plus the source superset, so a
 *   reviewer eyeballs the exact strip diff, per `rule.require.declapract-integration-tests`.
 */

const FIXTURE = './src/practices/cicd-service/.test/assets/demo-repo-service';
const DECLARATIONS_MIRROR = './src/.test/assets/cicd-service/declarations';
const PROVISION_PATH = '.github/workflows/provision.yml';
const SOURCE_SUPERSET =
  'src/practices/cicd-service/best-practice/.github/workflows/provision.yml';

const RDS_JOBS = [
  'sql-schema-prep:',
  'sql-schema-prod:',
  'aws-prep-declastruct:',
  'aws-prod-declastruct:',
];
const GENERIC_JOBS = [
  'github:',
  'aws-test-terraform:',
  'aws-prep-terraform:',
  'aws-prod-terraform:',
];

describe('provision.yml — the D28 rds-jobs gate, end to end', () => {
  given('[case1] an rds-usecase consumer (lambda-service-with-rds)', () => {
    const tempDir = genTempDir({
      slug: 'declapract-cicd-service-provision-rds',
      clone: FIXTURE,
      symlink: [
        { at: 'declarations', to: DECLARATIONS_MIRROR },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (rel: string) => fs.readFile(path.join(tempDir, rel), 'utf-8');
    const exists = async (rel: string): Promise<boolean> =>
      fs
        .access(path.join(tempDir, rel))
        .then(() => true)
        .catch(() => false);
    const applyProvision = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.rds.yml'),
        file: PROVISION_PATH,
      });

    const state = useBeforeAll(async () => {
      const before = await exists(PROVISION_PATH);
      await applyProvision();
      const after1 = await read(PROVISION_PATH);
      await applyProvision(); // second apply — prove a fixed point
      const after2 = await read(PROVISION_PATH);
      return { before, after1, after2 };
    }, 170_000);

    when('[t0] before any apply', () => {
      then('the consumer has no provision.yml yet', () => {
        expect(state.before).toBe(false);
      });
    });

    when('[t1] the cicd-service provision declaration is applied', () => {
      then('the created file holds ALL 4 rds jobs', () => {
        for (const job of RDS_JOBS) expect(state.after1).toContain(job);
      });

      then('the generic jobs are present too', () => {
        for (const job of GENERIC_JOBS) expect(state.after1).toContain(job);
      });

      then('the emitted rds workflow matches snapshot', () => {
        expect(state.after1).toMatchSnapshot(
          'provision.yml — rds usecase (emitted superset)',
        );
      });
    });

    when('[t2] the declaration is applied a second time', () => {
      then('the second apply is a no-op (idempotent)', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });

  given('[case2] a non-rds consumer (lambda-service)', () => {
    const tempDir = genTempDir({
      slug: 'declapract-cicd-service-provision-nords',
      clone: FIXTURE,
      symlink: [
        { at: 'declarations', to: DECLARATIONS_MIRROR },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (rel: string) => fs.readFile(path.join(tempDir, rel), 'utf-8');
    const applyProvision = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.nords.yml'),
        file: PROVISION_PATH,
      });

    const state = useBeforeAll(async () => {
      await applyProvision();
      const after1 = await read(PROVISION_PATH);
      await applyProvision(); // second apply — prove a fixed point
      const after2 = await read(PROVISION_PATH);
      return { after1, after2 };
    }, 170_000);

    when('[t0] the cicd-service provision declaration is applied', () => {
      then('the emitted workflow STRIPS all 4 rds jobs', () => {
        for (const job of RDS_JOBS) expect(state.after1).not.toContain(job);
      });

      then('the generic jobs survive the strip', () => {
        for (const job of GENERIC_JOBS) expect(state.after1).toContain(job);
      });

      then(
        'the emitted narrowed workflow matches snapshot (the strip diff a reviewer eyeballs)',
        () => {
          expect(state.after1).toMatchSnapshot(
            'provision.yml — non-rds usecase (emitted, narrowed)',
          );
        },
      );
    });

    when('[t1] the declaration is applied a second time', () => {
      then('the second apply is a no-op (idempotent)', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });

  given('[case3] the shipped source superset the strip acts on', () => {
    // the strip's INPUT — snapshotted as the "before" a reviewer diffs the narrowed emit against,
    // since a fresh consumer starts with NO provision.yml (case1/case2 [t0] prove the absence).
    when('[t0] the practice ships its provision.yml superset', () => {
      then('the source superset holds all 4 rds jobs + matches snapshot', async () => {
        const superset = await fs.readFile(SOURCE_SUPERSET, 'utf-8');
        for (const job of RDS_JOBS) expect(superset).toContain(job);
        for (const job of GENERIC_JOBS) expect(superset).toContain(job);
        expect(superset).toMatchSnapshot(
          'provision.yml — source superset (before strip)',
        );
      });
    });
  });
});
