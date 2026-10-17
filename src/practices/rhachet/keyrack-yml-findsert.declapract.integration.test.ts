import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply evaluates the whole usecase, so widen the jest budget
jest.setTimeout(180_000);

/**
 * .what = pipeline test for the usecase-aware keyrack.yml findsert (#491, #487)
 * .why  = the unit grain proves check/fix in memory; only executeApply proves declapract matches
 *         `.agent/keyrack.yml`, feeds the aws practice into context.projectPractices, and writes the
 *         upgrade into a real repo file — and that a second apply is a no-op
 * .note = filter by `file` only, never `practice`: a practice filter narrows projectPractices and
 *         would silence the aws branch
 */
describe('rhachet — keyrack.yml AWS_PROFILE findsert', () => {
  const keyrackPath = '.agent/keyrack.yml';
  const DECLARED = {
    key: 'AWS_PROFILE',
    'is-optional-if-has': 'AWS_ACCESS_KEY_ID',
  };

  given('[case1] an aws repo whose keyrack.yml holds a bare AWS_PROFILE', () => {
    const tempDir = genTempDir({
      slug: 'rhachet-keyrack-aws',
      clone: './src/practices/rhachet/.test/assets/repo-keyrack-extant',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/rhachet/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');
      const read = () => fs.readFile(path.join(tempDir, keyrackPath), 'utf-8');
      const before = await read();
      await executeApply({ config, file: keyrackPath });
      const after1 = await read();
      await executeApply({ config, file: keyrackPath });
      const after2 = await read();
      return { before, after1, after2 };
    }, 170_000);

    when('[t0] the rhachet practice is applied', () => {
      then('the bare AWS_PROFILE is upgraded in place to is-optional-if-has', () => {
        const parsed = yaml.parse(state.after1);
        expect(parsed['env.test']).toEqual([DECLARED]);
        expect(parsed['env.all']).toBeUndefined();
      });

      then("the repo's own keys, extends, and comment survive", () => {
        const parsed = yaml.parse(state.after1);
        expect(parsed['env.prep']).toEqual(['OPENROUTER_API_KEY']);
        expect(parsed.extends).toEqual([
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        ]);
        expect(state.after1).toContain(
          '# the local aws login, from before is-optional-if-has',
        );
      });

      then('the before + after contents match snapshot', () => {
        expect(state.before).toMatchSnapshot('keyrack.yml — before');
        expect(state.after1).toMatchSnapshot('keyrack.yml — after');
      });
    });

    when('[t1] the practice is applied a second time', () => {
      then('the second apply is a no-op', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });

  given('[case2] the same repo with no aws practice in its usecase', () => {
    const tempDir = genTempDir({
      slug: 'rhachet-keyrack-node',
      clone: './src/practices/rhachet/.test/assets/repo-keyrack-extant',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/rhachet/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const state = useBeforeAll(async () => {
      const read = () => fs.readFile(path.join(tempDir, keyrackPath), 'utf-8');
      const before = await read();
      await executeApply({
        config: path.join(tempDir, 'declapract.use.node.yml'),
        file: keyrackPath,
      });
      return { before, after: await read() };
    }, 170_000);

    when('[t0] the rhachet practice is applied', () => {
      then('the keyrack.yml is left byte for byte', () => {
        expect(state.after).toEqual(state.before);
      });
    });
  });
});
