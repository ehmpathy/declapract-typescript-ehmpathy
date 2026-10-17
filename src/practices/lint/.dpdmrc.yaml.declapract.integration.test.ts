import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

// executeApply is slow (full practice evaluation), so widen the jest budget
jest.setTimeout(180_000);

/**
 * .what = pipeline test for the `.dpdmrc.yaml` policy check + fix (#628)
 * .why  = the file was EQUALS, so every apply deleted the cited devDep entries the policy itself
 *         allows. only executeApply proves the relaxed check lets an adopter entry survive, that
 *         a node_modules entry is repaired in place, and that a second apply changes zero bytes.
 * .teeth = turn the declaration back to EQUALS and case1 goes red: the cited entry is deleted.
 */
describe('lint practice .dpdmrc.yaml', () => {
  /**
   * .what = apply `.dpdmrc.yaml` twice on a temp clone, capture the file before + after each
   */
  const applyTwice = async (input: { tempDir: string; seed: string | null }) => {
    const rcPath = path.join(input.tempDir, '.dpdmrc.yaml');
    if (input.seed) await fs.writeFile(rcPath, input.seed);
    const config = path.join(input.tempDir, 'declapract.use.yml');
    const before = await fs.readFile(rcPath, 'utf-8');
    await executeApply({ config, file: '.dpdmrc.yaml' });
    const after1 = await fs.readFile(rcPath, 'utf-8');
    await executeApply({ config, file: '.dpdmrc.yaml' });
    const after2 = await fs.readFile(rcPath, 'utf-8');
    return { before, after1, after2 };
  };

  given('[case1] an adopter .dpdmrc.yaml with a cited devDep exclude entry', () => {
    const tempDir = genTempDir({
      slug: 'lint-dpdmrc-cited',
      clone: './src/practices/lint/.test/assets/repo-dpdmrc-extant',
      symlink: [{ at: 'declarations', to: './src/.test/assets/lint/declarations' }],
    });
    const state = useBeforeAll(
      async () => applyTwice({ tempDir, seed: null }),
      170_000,
    );

    when('[t0] declapract apply', () => {
      then('the entry survives', () => {
        expect(yaml.parse(state.after1).exclude).toEqual(['jest-circus']);
      });

      then('the file is untouched, comments and all', () => {
        expect(state.after1).toEqual(state.before);
      });
    });

    when('[t1] declapract apply a second time', () => {
      then('zero bytes change', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });

  given('[case2] an adopter .dpdmrc.yaml that excludes node_modules', () => {
    const tempDir = genTempDir({
      slug: 'lint-dpdmrc-node-modules',
      clone: './src/practices/lint/.test/assets/repo-dpdmrc-extant',
      symlink: [{ at: 'declarations', to: './src/.test/assets/lint/declarations' }],
    });
    const state = useBeforeAll(
      async () =>
        applyTwice({
          tempDir,
          seed: [
            '# this repo dpdm exclude list',
            'exclude:',
            '  # cited: jest-circus require cycle',
            '  - jest-circus',
            '  - ^node_modules',
            '',
          ].join('\n'),
        }),
      170_000,
    );

    when('[t0] declapract apply', () => {
      then('the node_modules entry is dropped and the cited entry survives', () => {
        expect(yaml.parse(state.after1).exclude).toEqual(['jest-circus']);
      });

      then('the comments survive', () => {
        expect(state.after1).toContain('# this repo dpdm exclude list');
        expect(state.after1).toContain('# cited: jest-circus require cycle');
      });

      then('before + after match snapshot', () => {
        expect(state.before).toMatchSnapshot('.dpdmrc.yaml — before');
        expect(state.after1).toMatchSnapshot('.dpdmrc.yaml — after');
      });
    });

    when('[t1] declapract apply a second time', () => {
      then('zero bytes change', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });
});
