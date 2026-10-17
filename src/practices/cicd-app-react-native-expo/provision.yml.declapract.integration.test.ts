import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { parse } from 'yaml';

// executeApply is slow (usecase evaluation), so widen the jest budget
jest.setTimeout(240_000);

/**
 * .what = end-to-end proof of the expo provision.yml merge-by-job declaration (#608)
 * .why  = the expo usecase composes `provision-github`, whose migration deletes
 *         `provision/github/**`; before this declaration no expo practice owned the
 *         `provision.yml` caller, so the repo kept a terraform job over an empty dir and its
 *         `github / plan` check failed on every branch. only a real apply proves declapract wires
 *         the custom check + fix to this file: the `github` job lands as the declastruct call,
 *         each job on the deleted dir leaves, and the repo's own aws job stays.
 * .note = the lean declarations mirror holds only cicd-app-react-native-expo + typescript-expo,
 *         so the apply evaluates two practices, not the full usecase
 */

const FIXTURE = './src/.test/assets/cicd-app-react-native-expo/demo-repo-expo';
const DECLARATIONS_MIRROR =
  './src/.test/assets/cicd-app-react-native-expo/declarations';
const PROVISION_PATH = '.github/workflows/provision.yml';

const genDemoRepo = (slug: string) =>
  genTempDir({
    slug,
    clone: FIXTURE,
    symlink: [
      { at: 'declarations', to: DECLARATIONS_MIRROR },
      { at: 'node_modules', to: 'node_modules' },
    ],
  });

describe('expo provision.yml — merge-by-job, end to end (#608)', () => {
  given('[case4] an expo repo with a provision.yml that holds a terraform github job and an aws job', () => {
    const tempDir = genDemoRepo('declapract-expo-provision-merge');
    const read = (rel: string) => fs.readFile(path.join(tempDir, rel), 'utf-8');
    const apply = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: PROVISION_PATH,
      });

    const state = useBeforeAll(async () => {
      const before = await read(PROVISION_PATH);
      await apply();
      const after1 = await read(PROVISION_PATH);
      await apply();
      const after2 = await read(PROVISION_PATH);
      return { before, after1, after2 };
    }, 230_000);

    when('[t0] declapract apply', () => {
      then('the github job calls the declastruct workflow with the github.repo wish', () => {
        const github = parse(state.after1).jobs.github;
        expect(github.uses).toEqual('./.github/workflows/.declastruct.yml');
        expect(github.with['wish-path']).toEqual(
          'provision/github.repo/resources.ts',
        );
      });

      then('no job still points at the deleted provision/github/ dir', () => {
        // read the parsed jobs, since a found comment may still name the dir as prose
        const jobsBefore = JSON.stringify(parse(state.before).jobs);
        const jobsAfter = JSON.stringify(parse(state.after1).jobs);
        expect(jobsBefore).toContain('provision/github/');
        expect(jobsAfter).not.toContain('provision/github/');
        expect(parse(state.after1).jobs['github-environment']).toBeUndefined();
      });

      then('the aws job survives, unchanged', () => {
        expect(parse(state.after1).jobs.aws).toEqual(
          parse(state.before).jobs.aws,
        );
        expect(state.after1).toContain(
          "# the repo's own aws job, which the practice never declares",
        );
      });

      then('the oidc permissions block lands for the declastruct call', () => {
        expect(parse(state.after1).permissions['id-token']).toEqual('write');
      });

      then('before + after match snapshot', () => {
        expect(state.before).toMatchSnapshot('provision.yml — before');
        expect(state.after1).toMatchSnapshot('provision.yml — after merge');
      });
    });

    when('[t1] declapract apply again', () => {
      then('zero bytes change', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });

  given('[case5] an expo repo with no provision.yml', () => {
    const tempDir = genDemoRepo('declapract-expo-provision-absent');
    const read = (rel: string) =>
      fs.readFile(path.join(tempDir, rel), 'utf-8').catch(() => null);

    const state = useBeforeAll(async () => {
      await fs.rm(path.join(tempDir, PROVISION_PATH));
      const before = await read(PROVISION_PATH);
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: PROVISION_PATH,
      });
      const after = await read(PROVISION_PATH);
      const template = await fs.readFile(
        'src/practices/cicd-app-react-native-expo/best-practice/.github/workflows/provision.yml',
        'utf-8',
      );
      return { before, after, template };
    }, 230_000);

    when('[t0] declapract apply', () => {
      then('provision.yml exists with the github job, equal to the template', () => {
        expect(state.before).toBeNull();
        expect(state.after).toEqual(state.template);
        expect(parse(state.after!).jobs.github.with['wish-path']).toEqual(
          'provision/github.repo/resources.ts',
        );
      });
    });
  });
});
