import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply is slow (full usecase evaluation), so widen the jest budget
jest.setTimeout(180_000); // 3 minutes

/**
 * .what = end-to-end proof of the retroactive rds-jobs STRIP, run through the REAL declapract apply
 *   pipeline against a genTempDir consumer that is ALREADY stamped with the full provision.yml
 *   superset. per `rule.require.declapract-integration-tests`, a `fix` that transforms a yaml file
 *   with logic is REQUIRED to carry a pipeline test — a unit test of `check`/`fix` never exercises
 *   the glob→file match, the `projectPractices` derivation through a real usecase, nor the file a
 *   consumer actually ends up with.
 * .why = the best-practice D28 gate is `CONTAINS`, so it is fix-forward for FRESH scaffolds only — a
 *   pre-stamped non-rds repo carries the superset, CONTAINS passes, no best-practice fix fires, and
 *   the 4 rds jobs (which reference `persist-with-rds` files the repo does not ship) fail its
 *   provision workflow. this bad-practice is the retroactive half. only a real apply proves
 *   declapract (1) matches the declaration to `.github/workflows/provision.yml`, (2) derives
 *   `projectPractices` from the resolved usecase (persist-with-rds ABSENT for `service-without-rds`,
 *   PRESENT for `service-with-rds`), (3) strips the rds tail for the non-rds repo, and (4) leaves the
 *   rds repo's superset intact.
 * .note = the apply is scoped by `file` ONLY, never by `practice`. a `--practice cicd-service` filter
 *   narrows `projectPractices` to `['cicd-service']` (getDesiredPractices), which would strip
 *   `persist-with-rds` from the derivation and silence the rds guard. file-only keeps every usecase
 *   practice in `projectPractices` while it applies just the provision.yml plan.
 * .note = the fixture already HOLDS a provision.yml (the superset), unlike the D28 fresh-scaffold
 *   test whose fixture starts with none. that pre-stamped state is the exact D28 retroactive gap
 *   this strip closes.
 * .note = the emitted file is snapshotted in full (both usecases), so a reviewer eyeballs the exact
 *   strip diff, per `rule.require.declapract-integration-tests`.
 */

const FIXTURE =
  './src/practices/cicd-service/.test/assets/demo-repo-pre-stamped-nords';
const DECLARATIONS_MIRROR = './src/.test/assets/cicd-service/declarations';
const PROVISION_PATH = '.github/workflows/provision.yml';

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

describe('rds-jobs-in-non-rds-service — the retroactive strip, end to end', () => {
  given('[case1] a pre-stamped non-rds consumer (lambda-service)', () => {
    const tempDir = genTempDir({
      slug: 'declapract-cicd-service-strip-rds-nords',
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
      const before = await read(PROVISION_PATH);
      await applyProvision();
      const after1 = await read(PROVISION_PATH);
      await applyProvision(); // second apply — prove a fixed point
      const after2 = await read(PROVISION_PATH);
      return { before, after1, after2 };
    }, 170_000);

    when('[t0] before the strip', () => {
      then('the pre-stamped file carries ALL 4 rds jobs', () => {
        for (const job of RDS_JOBS) expect(state.before).toContain(job);
      });

      then('the pre-stamped superset matches snapshot (the before diff)', () => {
        expect(state.before).toMatchSnapshot(
          'provision.yml — pre-stamped superset (before strip)',
        );
      });
    });

    when('[t1] the bad-practice strip is applied', () => {
      then('all 4 rds jobs are stripped', () => {
        for (const job of RDS_JOBS) expect(state.after1).not.toContain(job);
      });

      then('the generic jobs survive the strip', () => {
        for (const job of GENERIC_JOBS) expect(state.after1).toContain(job);
      });

      then(
        'the stripped workflow matches snapshot (the strip diff a reviewer eyeballs)',
        () => {
          expect(state.after1).toMatchSnapshot(
            'provision.yml — non-rds usecase (after strip)',
          );
        },
      );
    });

    when('[t2] the strip is applied a second time', () => {
      then('the second apply is a no-op (idempotent)', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });

  given('[case2] a pre-stamped rds consumer (lambda-service-with-rds)', () => {
    const tempDir = genTempDir({
      slug: 'declapract-cicd-service-strip-rds-rds',
      clone: FIXTURE,
      symlink: [
        { at: 'declarations', to: DECLARATIONS_MIRROR },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (rel: string) => fs.readFile(path.join(tempDir, rel), 'utf-8');
    const applyProvision = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.rds.yml'),
        file: PROVISION_PATH,
      });

    const state = useBeforeAll(async () => {
      const before = await read(PROVISION_PATH);
      await applyProvision();
      const after1 = await read(PROVISION_PATH);
      return { before, after1 };
    }, 170_000);

    when('[t0] the declaration is applied to an rds consumer', () => {
      then('the rds repo KEEPS all 4 rds jobs — the strip does not fire', () => {
        for (const job of RDS_JOBS) expect(state.after1).toContain(job);
      });

      then('the file is unchanged (an rds superset is already conformant)', () => {
        expect(state.after1).toEqual(state.before);
      });
    });
  });
});
