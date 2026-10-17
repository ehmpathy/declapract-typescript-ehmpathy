import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof of the uni-time → iso-time migration, run through the REAL declapract
 *   apply pipeline against a genTempDir clone of a consumer repo.
 * .why  = the package.json fix and the src fix are two declarations that must agree: the src fix
 *   rewrites each import to `iso-time` and each `Uni*` name to its `Iso*` twin (#662), so the
 *   package.json fix must install `iso-time` where `@ehmpathy/uni-time` sat (#642). only the pipeline
 *   proves both land on one repo.
 * .note = each touched file is snapshotted before AND after.
 */
describe('dates-and-times uni-time migration', () => {
  given('[case1] a repo with @ehmpathy/uni-time in dependencies and a src import of it', () => {
    const tempDir = genTempDir({
      slug: 'declapract-dates-uni-time',
      clone:
        './src/practices/dates-and-times/bad-practices/uni-time/.test/assets/demo-repo-with-uni-time',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/dates-and-times/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const pkgPath = 'package.json';
    const srcPath = 'src/domain.objects/SurfLesson.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyFix = async () => {
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'dates-and-times',
        file: pkgPath,
      });
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'dates-and-times',
        file: srcPath,
      });
    };

    when('[t0] the input (before any fix)', () => {
      then('package.json and the src file match snapshot', async () => {
        expect(await read(pkgPath)).toMatchSnapshot('package.json — before');
        expect(await read(srcPath)).toMatchSnapshot('SurfLesson.ts — before');
      });
    });

    when('[t1] the uni-time fixes are applied', () => {
      useThen('apply both fixes', async () => applyFix());

      then('package.json holds iso-time where @ehmpathy/uni-time sat (#642)', async () => {
        const after = await read(pkgPath);
        const pkg = JSON.parse(after);
        expect(pkg.dependencies['iso-time']).toEqual('1.11.7');
        expect(pkg.dependencies['@ehmpathy/uni-time']).toBeUndefined();
        expect(pkg.devDependencies['iso-time']).toBeUndefined();
        expect(after).toMatchSnapshot('package.json — after');
      });

      then('the src file reads iso-time and each Uni* name reads as its Iso* twin (#662)', async () => {
        const after = await read(srcPath);
        expect(after).toContain(
          "import { asIsoTimeStamp, type IsoDateStamp, type IsoTimeStamp } from 'iso-time';",
        );
        expect(after).toContain('bookedAt: IsoTimeStamp;');
        expect(after).toContain('lessonDay: IsoDateStamp;');
        expect(after).not.toMatch(/Uni[A-Z]/);
        expect(after).toMatchSnapshot('SurfLesson.ts — after');
      });
    });

    when('[t2] the fixes are applied a second time (idempotency)', () => {
      const passes = useThen('a second apply over its own output', async () => {
        const before = { pkg: await read(pkgPath), src: await read(srcPath) };
        await applyFix();
        const after = { pkg: await read(pkgPath), src: await read(srcPath) };
        return { before, after };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
