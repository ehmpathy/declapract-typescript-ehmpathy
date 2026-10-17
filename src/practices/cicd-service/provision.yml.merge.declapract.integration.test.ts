import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { parse } from 'yaml';

import { getAllWorkflowJobDrifts } from '../../utils/getAllWorkflowJobDrifts';

// executeApply is slow (full usecase evaluation), so widen the jest budget
jest.setTimeout(240_000);

/**
 * .what = end-to-end proof of the provision.yml merge-by-job fix (#685), run through the REAL
 *         declapract apply against a pre-oidc caller
 * .why  = the callee workflows went oidc-only; a caller still on the retired access-key inputs
 *         fails at github with `startup_failure` before any job starts. the old declaration was a
 *         text-contains check with no fix, so `apply` reported the drift and changed no byte. only a
 *         real apply proves declapract wires the custom check + fix to this file, that each declared
 *         job lands in its oidc shape, and that the repo's own job survives.
 * .note = the apply is scoped by `file`, so `projectPractices` keeps `persist-with-rds` and the
 *         declaration emits its rds superset. [t2] then runs a NARROW `--practice cicd-service`
 *         apply, where `projectPractices` shrinks and the emitted body drops the rds jobs — the
 *         merge must keep them, since an undeclared job is never stripped.
 */

const FIXTURE = './src/practices/cicd-service/.test/assets/demo-repo-pre-oidc';
const DECLARATIONS_MIRROR = './src/.test/assets/cicd-service/declarations';
const PROVISION_PATH = '.github/workflows/provision.yml';
const SOURCE_SUPERSET =
  'src/practices/cicd-service/best-practice/.github/workflows/provision.yml';

const DECLARED_JOBS = [
  'aws-test-terraform',
  'aws-prep-terraform',
  'aws-prod-terraform',
  'github',
  'sql-schema-prep',
  'sql-schema-prod',
  'aws-prep-declastruct',
  'aws-prod-declastruct',
];

describe('provision.yml — merge-by-job fix, end to end (#685)', () => {
  given('[case1] an rds service whose provision.yml is a pre-oidc caller with a repo-own job', () => {
    const tempDir = genTempDir({
      slug: 'declapract-cicd-service-provision-pre-oidc',
      clone: FIXTURE,
      symlink: [
        { at: 'declarations', to: DECLARATIONS_MIRROR },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (rel: string) => fs.readFile(path.join(tempDir, rel), 'utf-8');
    const config = () => path.join(tempDir, 'declapract.use.rds.yml');

    const state = useBeforeAll(async () => {
      const superset = await fs.readFile(SOURCE_SUPERSET, 'utf-8');
      const before = await read(PROVISION_PATH);
      await executeApply({ config: config(), file: PROVISION_PATH });
      const after1 = await read(PROVISION_PATH);
      await executeApply({ config: config(), file: PROVISION_PATH });
      const after2 = await read(PROVISION_PATH);
      await executeApply({ config: config(), practice: 'cicd-service' });
      const afterNarrow = await read(PROVISION_PATH);
      return { superset, before, after1, after2, afterNarrow };
    }, 230_000);

    when('[t0] declapract apply', () => {
      then('each declared job matches the oidc template shape', () => {
        const jobsAfter = parse(state.after1).jobs;
        const jobsDeclared = parse(state.superset).jobs;
        for (const name of DECLARED_JOBS)
          expect(jobsAfter[name]).toEqual(jobsDeclared[name]);
      });

      then('no retired access-key input survives in a declared job', () => {
        expect(state.before).toContain('aws-access-key-id');
        expect(state.after1).not.toContain('aws-access-key-id');
        expect(state.after1).not.toContain('aws-account-id');
      });

      then('the repo-own job survives, unchanged', () => {
        expect(parse(state.after1).jobs['seed-prep-fixtures']).toEqual(
          parse(state.before).jobs['seed-prep-fixtures'],
        );
        expect(state.after1).toContain(
          "# the repo's own job, which the practice never declares",
        );
      });

      then('the pull_request trigger stays bare, with no paths gate', () => {
        expect(parse(state.after1).on.pull_request).toBeNull();
      });

      then("the repo's own schedule trigger survives, comment and all", () => {
        expect(parse(state.after1).on.schedule).toEqual(
          parse(state.before).on.schedule,
        );
        expect(parse(state.after1).on.schedule).toEqual([
          { cron: '0 6 * * *' },
        ]);
        expect(state.after1).toContain(
          "# the repo's own nightly drift plan, which the practice never declares",
        );
      });

      then('the oidc permissions block lands', () => {
        expect(parse(state.after1).permissions).toEqual({
          'id-token': 'write',
          contents: 'read',
        });
      });

      then('the check passes on the fixed file', () => {
        expect(
          getAllWorkflowJobDrifts({
            found: state.after1,
            declared: state.superset,
            dropJobWhen: null,
          }),
        ).toEqual([]);
      });

      then('before + after match snapshot', () => {
        expect(state.before).toMatchSnapshot('provision.yml — before (pre-oidc)');
        expect(state.after1).toMatchSnapshot('provision.yml — after merge');
      });
    });

    when('[t1] declapract apply again', () => {
      then('zero bytes change', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });

    when('[t2] a narrow --practice cicd-service apply, where the rds jobs go undeclared', () => {
      then('the rds jobs and the repo-own job survive; zero bytes change', () => {
        expect(state.afterNarrow).toEqual(state.after1);
      });
    });
  });
});
