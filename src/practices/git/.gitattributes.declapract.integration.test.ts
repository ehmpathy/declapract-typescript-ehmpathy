import fs from 'node:fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { check as checkGit } from './best-practice/.gitattributes.declapract';

// executeApply evaluates the whole practice before the `file` filter narrows it
jest.setTimeout(5 * 60 * 1000);

const context = {} as Parameters<typeof checkGit>[1]; // .note = the check reads no context

// .note = a literal, independent of the declaration: the check is `x === fix(x)`, so it passes on
//         any fixed point and cannot by itself prove the bytes are the ones the practice promises
const MANAGED_SECTIONS = `# [git] exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# [git] auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

const MANAGED_ENTRIES = [
  'pnpm-lock.yaml -diff',
  'package-lock.json -diff',
  'pnpm-lock.yaml merge=theirs',
  'package-lock.json merge=theirs',
];

/**
 * .what = proves the git `.gitattributes` declaration through the real declapract pipeline
 * .why  = the unit suite proves the fix in isolation; only executeApply proves the declared
 *         path reaches the repo-root file, the check gates the fix, and the settled file
 *         satisfies the check — so a rerun is a no-op and the plan stops to flag it
 *         (rule.require.declapract-integration-tests, rule.require.idempotent-fixes)
 * .note = all five declarers together, and this repo's own file, are proven in
 *         `src/gitattributesDeclarers.declapract.integration.test.ts`
 */
describe('git .gitattributes', () => {
  given('[case1] a repo whose .gitattributes holds a legacy header, a legacy entry, and an out-of-section entry', () => {
    const tempDir = genTempDir({
      slug: 'git-gitattributes-legacy',
      clone: './src/practices/git/.test/assets/repo-with-legacy-gitattributes',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/git/declarations' },
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
        return { after: await read() };
      });

      then('the git check passes on the file', () => {
        expect(() => checkGit(scene.after, context)).not.toThrow();
      });

      then('the file holds the managed sections verbatim, then the repo-own line', () => {
        expect(scene.after).toEqual(`${MANAGED_SECTIONS}\n*.png binary\n`);
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

      then('the repo-own line survives, after the managed sections', () => {
        expect(scene.after.trim().split('\n').slice(-1)[0]).toEqual(
          '*.png binary',
        );
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
