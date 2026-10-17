import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof of the domain barrel move and the bare barrel import repoint (#655, #671).
 * .why  = two barrels (`domain/index.ts` → `./objects`, and `domain/objects/index.ts`) both move onto
 *   `domain.objects/index.ts`; the outer one, stripped, held no export and could win the path. and
 *   a bare `'@src/domain'` / `'../domain'` import matched neither the check nor the fix. only the real
 *   pipeline proves which file lands on the shared path.
 * .note = the outer barrel is applied AFTER the inner one — the order in which it used to win.
 */
describe('directory-structure-src domain barrels and bare barrel imports', () => {
  given('[case1] a repo with two domain barrels and bare barrel imports', () => {
    const tempDir = genTempDir({
      slug: 'declapract-dirs-two-barrels',
      clone: './src/.test/assets/directory-structure-src/demo-repo-with-two-domain-barrels',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/directory-structure-src/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const isPresent = (relativePath: string) =>
      fs
        .access(path.join(tempDir, relativePath))
        .then(() => true)
        .catch(() => false);
    const applyOne = (input: { file: string }) =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'directory-structure-src',
        file: input.file,
      });

    when('[t0] the input (before any fix)', () => {
      then('the barrels and the importer match snapshot', async () => {
        expect(await read('src/domain/index.ts')).toMatchSnapshot('outer barrel — before');
        expect(await read('src/domain/objects/index.ts')).toMatchSnapshot('inner barrel — before');
        expect(await read('src/domain.operations/getQuote.ts')).toMatchSnapshot('importer — before');
      });
    });

    when('[t1] the moves and the import repoint are applied', () => {
      const after = useThen('apply, outer barrel last', async () => {
        await applyOne({ file: 'src/domain/objects/index.ts' });
        await applyOne({ file: 'src/domain/objects/Quote.ts' });
        await applyOne({ file: 'src/domain/index.ts' });
        await applyOne({ file: 'src/domain.operations/getQuote.ts' });
        return {
          barrel: await read('src/domain.objects/index.ts'),
          importer: await read('src/domain.operations/getQuote.ts'),
          outerPresent: await isPresent('src/domain/index.ts'),
          quotePresent: await isPresent('src/domain.objects/Quote.ts'),
        };
      });

      then('domain.objects/index.ts holds the inner barrel list, never the stripped outer one (#655)', () => {
        expect(after.barrel).toContain("export * from './Quote';");
        expect(after.outerPresent).toBe(false);
        expect(after.quotePresent).toBe(true);
        expect(after.barrel).toMatchSnapshot('domain.objects/index.ts — after');
      });

      then('each bare barrel import is repointed, and a package subpath is left alone (#655, #671)', () => {
        expect(after.importer).toContain("from '@src/domain.objects';");
        expect(after.importer).toContain("from '../domain.objects';");
        expect(after.importer).toContain("from 'some-pkg/domain';");
        expect(after.importer).toMatchSnapshot('importer — after');
      });
    });

    when('[t2] the importer and the barrel are applied a second time (idempotency)', () => {
      const passes = useThen('a second apply over its own output', async () => {
        const files = ['src/domain.objects/index.ts', 'src/domain.operations/getQuote.ts'];
        const before = await Promise.all(files.map((file) => read(file)));
        await applyOne({ file: files[0]! });
        await applyOne({ file: files[1]! });
        const after = await Promise.all(files.map((file) => read(file)));
        return { before, after };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
