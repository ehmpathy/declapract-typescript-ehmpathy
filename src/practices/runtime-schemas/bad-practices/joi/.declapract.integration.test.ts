import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof of the joi->zod migration, run through the REAL declapract apply
 *   pipeline against a genTempDir clone of a consumer repo. per
 *   rule.require.declapract-integration-tests, a fix that TRANSFORMS a file (regex rewrite + a
 *   value-rewrite @declapract:review marker) owes a pipeline test — a unit test of the exported
 *   `fix` never exercises the source-file glob -> file match, nor that the marker lands on disk.
 * .why = the shape-for-shape rewrite makes three silent semantic changes a regex cannot get right
 *   (optionality, unknown-key policy, date coercion), so the fix prepends a @declapract:review
 *   marker that names them rather than ship a silent guess (#594).
 * .note = the target file is snapshotted in full (before AND after), so a reviewer can eyeball the
 *   exact end-state, per rule.require.declapract-integration-tests.
 * .teeth = the input imports joi + declares a `Joi.object` schema. the after-state proves the import
 *   is rewritten to `zod`, the `Joi.*` calls become `z.*`, and the @declapract:review marker lands
 *   on disk — the glue a mocked-context unit test cannot show.
 */
describe('joi->zod migration', () => {
  given('[case1] a repo with a joi schema in a src file', () => {
    const tempDir = genTempDir({
      slug: 'declapract-joi',
      clone: './src/practices/runtime-schemas/bad-practices/joi/.test/assets/demo-repo-with-joi',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/runtime-schemas/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const targetPath = 'src/contract/schemas/widget.schema.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyMigrate = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'runtime-schemas',
        file: targetPath,
      });

    when('[t0] the migration input (before any fix)', () => {
      then('the src file imports joi + declares a Joi schema + matches snapshot', async () => {
        const before = await read(targetPath);
        expect(before).toContain("from 'joi'");
        expect(before).toContain('Joi.object(');
        expect(before).not.toContain('@declapract:review');
        expect(before).toMatchSnapshot('widget.schema.ts — before');
      });
    });

    when('[t1] the joi fix is applied', () => {
      useThen('migrate the joi schema to zod', async () => applyMigrate());

      then(
        'the import + schema are rewritten to zod, the review marker lands, and it matches snapshot',
        async () => {
          const after = await read(targetPath);

          // the import is rewritten to zod
          expect(after).toContain("import { z } from 'zod'");
          expect(after).not.toContain("from 'joi'");

          // the Joi.* schema calls become z.*
          expect(after).toContain('z.object(');
          expect(after).not.toContain('Joi.object(');

          // the value-rewrite marker lands on disk — the three silent semantic guesses
          // (optionality, unknown keys, date coercion) are loud, per #594
          expect(after).toContain('@declapract:review');
          expect(after).toContain('optionality');

          // a bare joi `.uuid()` keeps its layout-only semantics as `z.guid()` (#629)
          expect(after).toContain('id: z.guid(),');
          expect(after).not.toContain('.uuid()');

          // the marker names number coercion beside date coercion (#548)
          expect(after).toContain('z.coerce.number()');
          expect(after).toContain('z.coerce.date()');

          // full content, for the reviewer's eye
          expect(after).toMatchSnapshot('widget.schema.ts — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // post-rewrite the file imports from zod, so the check no longer detects the bad practice and
      // the fix does not run — the second apply changes zero bytes, and the marker is never
      // double-prepended (per rule.require.idempotent-fixes).
      const passes = useThen('a second apply over its own output', async () => {
        const before = await read(targetPath); // post-first-migrate
        await applyMigrate(); // second apply
        const after = await read(targetPath);
        return { before, after };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });

  // #654 + #545 + #624: the joi fixer, the zod floor, and the single-identity override all write
  // package.json in one apply. the end state must name ONE zod version, read from the key pnpm reads.
  given('[case2] a joi repo on sdk-aws-lambda 0.7.1, with zod ^3 under a 3.23.8 override', () => {
    const tempDir = genTempDir({
      slug: 'declapract-joi-deps',
      clone:
        './src/practices/runtime-schemas/bad-practices/joi/.test/assets/demo-repo-with-joi-deps',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/runtime-schemas/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const pkgPath = 'package.json';
    const read = () => fs.readFile(path.join(tempDir, pkgPath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'runtime-schemas',
        file: pkgPath,
      });

    when('[t0] the input (before any fix)', () => {
      then('package.json matches snapshot', async () => {
        expect(await read()).toMatchSnapshot('package.json — before');
      });
    });

    when('[t1] the runtime-schemas fixes are applied', () => {
      useThen('apply the package.json fixes', async () => applyFix());

      then('joi is gone, and zod + its override both name 4.4.3', async () => {
        const after = await read();
        const pkg = JSON.parse(after);
        expect(pkg.dependencies.joi).toBeUndefined();
        expect(pkg.dependencies.zod).toEqual('4.4.3');
        expect(pkg.pnpm.overrides.zod).toEqual('4.4.3');
        expect(pkg.dependencies['sdk-aws-lambda']).toEqual('0.7.1');
        expect(after).not.toContain('@declapract{');
        expect(after).toMatchSnapshot('package.json — after');
      });
    });

    when('[t2] the fixes are applied a second time (idempotency)', () => {
      const passes = useThen('a second apply over its own output', async () => {
        const before = await read();
        await applyFix();
        const after = await read();
        return { before, after };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
