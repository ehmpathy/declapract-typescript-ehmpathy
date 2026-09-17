import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

// executeApply is slow (full usecase evaluation), so widen the jest budget
jest.setTimeout(180_000); // 3 minutes

/**
 * .what = pipeline test for the usecase-aware format package.json `contents` fn (r001.b3)
 * .why  = a unit test proves the `contents` fn in isolation against a mocked context; only the
 *         real executeApply pipeline proves that declapract:
 *         - matches the package.json declaration to the consumer's package.json
 *         - feeds context.projectPractices with the terraform signal derived through a REAL usecase
 *           (terraform-common present vs absent), NOT a hand-built context object
 *         - emits the chained fix:format / test:format the branch builds, into the file on disk
 *         per rule.require.declapract-integration-tests, a usecase-aware `contents` fn that silently
 *         changes what a consumer receives owes an executeApply pipeline test, not a unit test alone.
 * .note = INTEGRATION by rule.forbid.unit.remote-boundaries: it reads the filesystem + runs
 *         executeApply against a temp clone. no credential, no network. the fixtures live under a
 *         `.test` dot-dir (excluded from tsconfig/jest globs); a lean declarations mirror symlinks
 *         only format + terraform-common so the whole-usecase compile does not blow the hook timeout.
 * .note = the confound: terraform-common's OWN package.json also declares a standalone
 *         `fix:format:terraform` command, so a bare "contains fix:format:terraform" assertion could
 *         not isolate the format branch. the DISTINGUISHING signal for format's branch is the
 *         CHAINED `fix:format` value (`... && npm run fix:format:terraform`), which only format emits.
 *         so every assertion reads the `fix:format` chain value, never the standalone key.
 * .teeth = with-terraform: the emitted `fix:format` chain MUST include the terraform sub-command —
 *          a revert of the branch to biome-only reddens it. without-terraform: the chain MUST be
 *          biome-only — a branch that fired on the wrong (absent) signal reddens it.
 */
describe('format practice — the usecase-aware package.json contents fn (r001.b3)', () => {
  const readCommands = async (
    tempDir: string,
  ): Promise<Record<string, string>> => {
    const raw = await fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');
    return JSON.parse(raw).scripts as Record<string, string>;
  };

  given('[case1] a consumer on a terraform usecase', () => {
    const tempDir = genTempDir({
      slug: 'format-pkgjson-with-terraform',
      clone: './src/.test/assets/format/repo-with-terraform',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/format/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    // useBeforeAll RETURNS the captured reads (no in-place mutation of a shared const).
    // .note = filter by file ONLY, never by practice. the practice filter narrows
    //         projectPractices too (getDesiredPractices), which would strip terraform-common
    //         and silence the branch. file-only keeps every usecase practice in projectPractices
    //         while it applies just the package.json plan.
    const commands = useBeforeAll(async () => {
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: 'package.json',
      });
      return readCommands(tempDir);
    }, 170_000);

    when('[t0] the format package.json is applied', () => {
      then('the fix:format chain includes the terraform sub-command', () => {
        expect(commands['fix:format']).toContain('npm run fix:format:terraform');
      });

      then('the fix:format chain still leads with biome', () => {
        expect(commands['fix:format']).toContain('npm run fix:format:biome');
      });

      then('the test:format chain includes the terraform sub-command', () => {
        expect(commands['test:format']).toContain(
          'npm run test:format:terraform',
        );
      });

      then('the emitted commands block matches snapshot', () => {
        expect(commands).toMatchSnapshot('with-terraform — commands');
      });
    });
  });

  given('[case2] a consumer on a non-terraform usecase', () => {
    const tempDir = genTempDir({
      slug: 'format-pkgjson-without-terraform',
      clone: './src/.test/assets/format/repo-without-terraform',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/format/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const commands = useBeforeAll(async () => {
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: 'package.json',
      });
      return readCommands(tempDir);
    }, 170_000);

    when('[t0] the format package.json is applied', () => {
      then('the fix:format chain is biome-only', () => {
        expect(commands['fix:format']).toEqual('npm run fix:format:biome');
      });

      then('the fix:format chain omits the terraform sub-command (the teeth)', () => {
        expect(commands['fix:format']).not.toContain(
          'npm run fix:format:terraform',
        );
      });

      then('the test:format chain omits the terraform sub-command', () => {
        expect(commands['test:format']).not.toContain(
          'npm run test:format:terraform',
        );
      });

      then('the emitted commands block matches snapshot', () => {
        expect(commands).toMatchSnapshot('without-terraform — commands');
      });
    });
  });
});
