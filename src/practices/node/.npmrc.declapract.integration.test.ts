import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so widen the jest budget
jest.setTimeout(180_000); // 3 minutes

/**
 * .what = pipeline test for the usecase-aware .npmrc findsert (check/fix union)
 * .why  = a unit test proves the check/fix in isolation; only the real
 *         executeApply pipeline proves that declapract:
 *         - matches the .npmrc declaration to the target file
 *         - feeds context.projectPractices with the expo signal
 *           (cicd-app-react-native-expo present in the usecase)
 *         - findserts the declared lines into the consumer's .npmrc: the base
 *           node lines PLUS the hoisted-linker block, unioned in so a repo's own
 *           lines survive (a consumer merge, NOT an EQUALS overwrite)
 *         - reaches a fixed point on a second apply (idempotent)
 */
describe('node practice .npmrc — expo hoisted linker', () => {
  given('[case1] an expo consumer repo with a base node .npmrc', () => {
    const tempDir = genTempDir({
      slug: 'node-npmrc-expo',
      clone: './src/practices/node/.test/assets/repo-expo-npmrc',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/expo/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const npmrcPath = () => path.join(tempDir, '.npmrc');

    // useBeforeAll RETURNS the captured reads (no in-place mutation of a shared const)
    const readState = useBeforeAll(async () => {
      // capture the consumer's own .npmrc before any apply
      const before = await fs.readFile(npmrcPath(), 'utf-8');

      // first apply
      // .note = filter by file ONLY, never by practice. the practice filter
      //         narrows projectPractices too (getDesiredPractices), which would
      //         strip cicd-app-react-native-expo and silence the expo branch.
      //         file-only keeps every usecase practice in projectPractices while
      //         it applies just the .npmrc plan.
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: '.npmrc',
      });
      const after1 = await fs.readFile(npmrcPath(), 'utf-8');

      // second apply — to prove a fixed point
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: '.npmrc',
      });
      const after2 = await fs.readFile(npmrcPath(), 'utf-8');

      return { before, after1, after2 };
    }, 170_000);

    when('[t0] the node practice is applied', () => {
      then('the base node lines are preserved', () => {
        expect(readState.after1).toContain('engine-strict=true');
        expect(readState.after1).toContain('save-exact=true');
        expect(readState.after1).toContain('message=%s 🎉');
      });

      then('the hoisted-linker block is appended', () => {
        expect(readState.after1).toContain('node-linker=hoisted');
        expect(readState.after1).toContain('public-hoist-pattern[]=*expo*');
        expect(readState.after1).toContain(
          'public-hoist-pattern[]=*react-native*',
        );
        expect(readState.after1).toContain(
          'public-hoist-pattern[]=@react-native/*',
        );
        expect(readState.after1).toContain('public-hoist-pattern[]=metro*');
        expect(readState.after1).toContain('public-hoist-pattern[]=*metro-*');
      });

      then('the before + after contents match snapshot', () => {
        expect(readState.before).toMatchSnapshot('.npmrc — before');
        expect(readState.after1).toMatchSnapshot('.npmrc — after apply');
      });
    });

    when('[t1] the node practice is applied a second time', () => {
      then('the fixed point holds — after2 equals after1', () => {
        expect(readState.after2).toEqual(readState.after1);
      });

      then('a single hoist block exists, never a duplicate', () => {
        const occurrences =
          readState.after2.split('node-linker=hoisted').length - 1;
        expect(occurrences).toEqual(1);
      });
    });
  });

  /**
   * .what = a narrow-scope apply of the node practice on an expo repo leaves the hoist intact
   * .why  = a narrow `declapract fix --practice node` on an expo repo makes
   *         projectPractices === ['node'], so the expo branch does not fire. the `.npmrc`
   *         declaration is a findsert (check/fix union) that appends only absent lines, so a
   *         narrow-scope apply is a no-op on an already-hoisted `.npmrc`. this test reproduces
   *         that narrow-scope invocation and asserts the hoist is preserved — it fails if the
   *         declaration is ever changed to an EQUALS overwrite (which would append no union
   *         and rewrite the file to base).
   */
  given('[case2] a narrow --practice node apply on an expo repo keeps the hoist', () => {
    const tempDir = genTempDir({
      slug: 'node-npmrc-expo-narrow',
      clone: './src/practices/node/.test/assets/repo-expo-npmrc',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/expo/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const npmrcPath = () => path.join(tempDir, '.npmrc');

    const readState = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.yml');

      // first, reach the CORRECT expo state via the SUPPORTED path (file filter keeps
      // every usecase practice in projectPractices, so the expo branch fires)
      await executeApply({ config, file: '.npmrc' });
      const withHoist = await fs.readFile(npmrcPath(), 'utf-8');

      // now apply the narrow scope: `--practice node` makes projectPractices === ['node'],
      // so the expo branch does not fire. the findsert appends only absent lines, so the
      // hoist is preserved.
      await executeApply({ config, practice: 'node' });
      const afterNarrow = await fs.readFile(npmrcPath(), 'utf-8');

      return { withHoist, afterNarrow };
    }, 170_000);

    when('[t0] the supported path first produced the hoist', () => {
      then('the hoisted-linker block is present', () => {
        expect(readState.withHoist).toContain('node-linker=hoisted');
        expect(readState.withHoist).toContain('public-hoist-pattern[]=*expo*');
      });
    });

    when('[t1] a narrow `--practice node` fix then runs on that repo', () => {
      then('the hoist is preserved', () => {
        expect(readState.afterNarrow).toContain('node-linker=hoisted');
        expect(readState.afterNarrow).toContain(
          'public-hoist-pattern[]=*expo*',
        );
      });

      then('the base node lines survive too', () => {
        expect(readState.afterNarrow).toContain('engine-strict=true');
        expect(readState.afterNarrow).toContain('save-exact=true');
      });

      then('the narrow-scope apply is a no-op — afterNarrow equals withHoist', () => {
        expect(readState.afterNarrow).toEqual(readState.withHoist);
      });
    });
  });
});
