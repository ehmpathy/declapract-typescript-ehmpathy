import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous ceiling
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof of the old-stage-enum migration, run through the REAL declapract apply
 *   pipeline against a genTempDir clone of a consumer repo. per
 *   rule.require.declapract-integration-tests, a fix that TRANSFORMS a file (parser-driven splice)
 *   owes a pipeline test — a unit test of the exported `fix` never exercises the glob -> file match.
 * .why = the fix migrates the two UNAMBIGUOUS members (`Stage.PRODUCTION` -> `'prod'`,
 *   `Stage.TEST` -> `'test'`) and LEAVES `Stage.DEVELOPMENT` in place (axis-ambiguous, never
 *   guessed), so the check stays red until a human decides the axis. it uses the typescript PARSER,
 *   not a hand-rolled lexer, so an enum mention inside a regex literal or a template-literal's static
 *   text is that token's own text — never a property access — and is preserved byte-for-byte.
 * .note = the target file is snapshotted in full (before AND after), so a reviewer can eyeball the
 *   exact end-state, per rule.require.declapract-integration-tests.
 * .teeth = the input holds `Stage.PRODUCTION` + `Stage.TEST` (migrated), `Stage.DEVELOPMENT` (left
 *   in place), a regex literal `/Stage\.PRODUCTION/` and a template-static `Stage.TEST` (both
 *   preserved). the after-state proves all of these — and that NO `/s'prod'/`-class corruption ever
 *   lands in the emitted file (the whole reason the lexer was retired for the parser).
 */
describe('old-stage-enum migration', () => {
  given('[case1] a repo with Stage.* enum references in a src file', () => {
    const tempDir = genTempDir({
      slug: 'declapract-old-stage-enum',
      clone: './src/practices/environments/bad-practices/old-stage-enum/.test/assets/demo-repo-with-stage-enum',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/environments/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const targetPath = 'src/logic/getDeployTarget.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyMigrate = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'environments',
        file: targetPath,
      });

    when('[t0] the migration input (before any fix)', () => {
      then('the src file holds the raw Stage.* references + matches snapshot', async () => {
        const before = await read(targetPath);
        expect(before).toContain('Stage.PRODUCTION');
        expect(before).toContain('Stage.TEST');
        expect(before).toContain('Stage.DEVELOPMENT');
        expect(before).toMatchSnapshot('getDeployTarget.ts — before');
      });
    });

    when('[t1] the old-stage-enum fix is applied', () => {
      useThen('migrate the unambiguous Stage members', async () => applyMigrate());

      then(
        'the unambiguous members migrate, DEVELOPMENT + non-code mentions survive, and it matches snapshot',
        async () => {
          const after = await read(targetPath);

          // the two unambiguous PROPERTY ACCESSES migrate to their string literals
          expect(after).toContain("export const prodStage = 'prod';");
          expect(after).toContain("export const testStage = 'test';");

          // the axis-ambiguous member is LEFT in place, never guessed
          expect(after).toContain('Stage.DEVELOPMENT');

          // the import stays, because a live Stage.DEVELOPMENT reference still needs it
          expect(after).toContain("import { Stage } from 'sdk-environment';");

          // the regex literal + template-static mentions are NOT property accesses, so the parser
          // never splices them — they survive byte-for-byte (a splice into the regex would corrupt
          // this exact text span, so its survival IS the pipeline-grain corruption-safety proof;
          // the hard-position corruption cases are clamped in the unit suite)
          expect(after).toContain('/Stage\\.PRODUCTION/');
          expect(after).toContain('deploy target: Stage.TEST');
          // the migrated VALUE-SPLICES appear exactly where the property accesses were, and nowhere
          // else. count the `= '<slug>'` splice form (not a bare `'<slug>'`), because the review
          // marker's option-list carries `'test'|'prep'|'prod'` as prose — those have no `= ` prefix,
          // so this count clamps the splices alone and stays 1 despite the marker (r9.b2).
          expect((after.match(/= 'prod'/g) || []).length).toBe(1);
          expect((after.match(/= 'test'/g) || []).length).toBe(1);

          // r9.b2: the fix marks the axis-ambiguous line with a `// @declapract:review:` comment on
          // the line DIRECTLY ABOVE the reference, so a red plan names WHERE + WHAT to pick by hand.
          // find the CODE line (the real property access), not the marker — the marker's own text
          // also holds `Stage.DEVELOPMENT`, so filter it out by the `@declapract:review` tag.
          const lines = after.split('\n');
          const devCodeLineIndex = lines.findIndex(
            (line) =>
              line.includes('Stage.DEVELOPMENT') &&
              !line.includes('@declapract:review'),
          );
          expect(devCodeLineIndex).toBeGreaterThan(0);
          expect(lines[devCodeLineIndex - 1]).toContain('@declapract:review');
          expect(lines[devCodeLineIndex - 1]).toContain(
            "access ('test'|'prep'|'prod')",
          );

          // full content, for the reviewer's eye
          expect(after).toMatchSnapshot('getDeployTarget.ts — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // Stage.DEVELOPMENT remains a live property access, so the check still detects it and the fix
      // still runs — but no unambiguous member is left to migrate and the import stays, so the
      // second apply changes zero bytes (per rule.require.idempotent-fixes).
      const passes = useThen(
        'a second apply over its own output',
        async () => {
          const before = await read(targetPath); // post-first-migrate
          await applyMigrate(); // second apply
          const after = await read(targetPath);
          return { before, after };
        },
      );

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
