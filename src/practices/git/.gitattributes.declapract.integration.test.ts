import fs from 'node:fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

// executeApply evaluates the whole git practice before the `file` filter narrows it
jest.setTimeout(5 * 60 * 1000);

const MANAGED_ENTRIES = [
  'pnpm-lock.yaml -diff',
  'package-lock.json -diff',
  'pnpm-lock.yaml merge=theirs',
  'package-lock.json merge=theirs',
];

/**
 * .what = proves the .gitattributes fix through the real declapract pipeline
 * .why  = the unit suite proves the fix in isolation; only executeApply proves the declared path
 *         reaches the repo-root file, the CONTAINS check gates the fix, and the settled file
 *         satisfies that check — so a rerun is a no-op and the plan stops to flag it
 *         (rule.require.declapract-integration-tests, rule.require.idempotent-fixes)
 * .teeth = emit any section's entries out of declared order, and [t1] `contains the template`
 *          reddens while [t2] stays a byte-identical fixed point — the reflag loop a fixed-point
 *          test alone cannot see. the prior fix (sections re-assembled in place, a stray entry
 *          left outside its section) was in exactly that state
 */
describe('git .gitattributes', () => {
  given('[case1] a repo whose .gitattributes holds a legacy header, a legacy entry, and an out-of-section entry', () => {
    const tempDir = genTempDir({
      slug: 'git-gitattributes-legacy',
      clone: './src/practices/git/.test/assets/repo-with-legacy-gitattributes',
      symlink: [
        { at: 'declarations', to: './.test/assets/git/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });
    const read = () =>
      fs.readFile(path.join(tempDir, '.gitattributes'), 'utf-8');
    const apply = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'git',
        file: '.gitattributes',
      });

    when('[t0] before any apply', () => {
      then('the input file matches snapshot', async () => {
        expect(await read()).toMatchSnapshot('.gitattributes — before');
      });
    });

    when('[t1] apply runs', () => {
      const scene = useThen('apply settles', async () => {
        await apply();
        const template = await fs.readFile(
          path.join(__dirname, 'best-practice/.gitattributes'),
          'utf-8',
        );
        return { after: await read(), template };
      });

      then('the file contains the template verbatim — the CONTAINS check passes', () => {
        expect(scene.after).toContain(scene.template.trim());
      });

      then('the legacy header and the legacy entry are gone', () => {
        expect(scene.after).not.toContain('# exclude package-lock from git diff');
        expect(scene.after).not.toContain('pnpm-lock.json -diff');
      });

      then('each managed entry appears exactly once', () => {
        MANAGED_ENTRIES.forEach((entry) =>
          expect(
            scene.after.split('\n').filter((line) => line.trim() === entry),
          ).toHaveLength(1),
        );
      });

      then('the repo-own line survives', () => {
        expect(scene.after).toContain('*.png binary');
      });

      then('no declapract template syntax leaked', () => {
        expect(scene.after).not.toContain('@declapract{');
      });

      then('the output matches snapshot', () => {
        expect(scene.after).toMatchSnapshot('.gitattributes — after');
      });
    });

    when('[t2] apply runs a second time', () => {
      const before = useBeforeAll(async () => ({ contents: await read() }));
      const scene = useThen('apply again', async () => {
        await apply();
        return { after: await read() };
      });

      then('the file is byte-identical — the apply is a fixed point', () => {
        expect(scene.after).toEqual(before.contents);
      });
    });
  });
});
