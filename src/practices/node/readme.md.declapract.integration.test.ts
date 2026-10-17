import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the node readme.md fix (#607), run through the REAL declapract apply
 *   pipeline against a genTempDir clone of a consumer repo whose readme.md lacks the declared title.
 * .why  = declapract's own CONTAINS fix writes only an ABSENT file, so a present readme without the
 *   title had no fix and core marked it manual. the custom fix prepends the title atop the
 *   adopter's own text. a unit test of the fix is necessary but NOT sufficient
 *   (`rule.require.declapract-integration-tests`): only the pipeline proves the
 *   `@declapract{variable.projectName}` substitution feeds the right `declaredFileContents`, that
 *   the CONTAINS check gates the custom fix, and that a second apply is a no-op on the real file.
 */
describe('node readme.md title prepend (#607)', () => {
  given('[case1] a repo whose readme.md lacks the declared title', () => {
    const tempDir = genTempDir({
      slug: 'declapract-node-readme-without-title',
      clone: './src/practices/node/.test/assets/repo-readme-without-title',
      symlink: [{ at: 'declarations', to: 'src' }],
    });

    const readmePath = 'readme.md';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'node',
        file: readmePath,
      });

    when('[t0] the input (before any fix)', () => {
      then('the readme.md input matches snapshot', async () => {
        expect(await read(readmePath)).toMatchSnapshot('readme.md — before');
      });
    });

    when('[t1] the readme.md fix is applied', () => {
      const result = useThen('the apply succeeds', async () => {
        await applyFix();
        return { contents: await read(readmePath) };
      });

      then('the readme opens with the declared title, substituted from the projectName', () => {
        expect(result.contents.startsWith('# svc-example\n')).toEqual(true);
      });

      then("the adopter's own text is kept below the title", () => {
        expect(result.contents).toContain('surf lessons, booked.');
        expect(result.contents).toContain('book a lesson with `npm run book`.');
      });

      then('no @declapract marker leaked into the output', () => {
        expect(result.contents).not.toContain('@declapract{');
      });

      then('the readme.md matches snapshot', () => {
        expect(result.contents).toMatchSnapshot('readme.md — after');
      });
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      const result = useThen('a second apply over its own output', async () => {
        const before = await read(readmePath);
        await applyFix();
        return { before, after: await read(readmePath) };
      });

      then('the second apply changes zero bytes — the title is not prepended twice', () => {
        expect(result.after).toEqual(result.before);
      });
    });
  });
});
