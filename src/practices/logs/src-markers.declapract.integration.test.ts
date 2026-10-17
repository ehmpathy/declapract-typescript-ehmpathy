import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof that the logs src declarations stamp their review lines on a real repo.
 * .why  = two src files the logs practice cannot rewrite safely: an import of the retired
 *   `simple-leveled-log-methods` (#643) and a vendored withLogTrail fork (#635). each fix names the
 *   move above the line, rewrites no code, and must converge on a re-apply.
 * .note = the declarations dir is symlinked, so the consumer's own src/ holds the target files.
 */
describe('logs src review markers', () => {
  given('[case1] a repo with a leveled-log import and a vendored withLogTrail fork', () => {
    const tempDir = genTempDir({
      slug: 'declapract-logs-src-markers',
      clone:
        './src/practices/logs/bad-practices/vendored-log-trail/.test/assets/demo-repo-with-log-forks',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/logs/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const forkPath = 'src/utils/withInputOutputTracing.ts';
    const opPath = 'src/domain.operations/getWaveReport.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyOne = (input: { file: string }) =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'logs',
        file: input.file,
      });
    const applyFix = async () => {
      await applyOne({ file: forkPath });
      await applyOne({ file: opPath });
    };

    when('[t0] the input (before any fix)', () => {
      then('both src files match snapshot', async () => {
        expect(await read(forkPath)).toMatchSnapshot('fork — before');
        expect(await read(opPath)).toMatchSnapshot('op — before');
      });
    });

    when('[t1] the logs fixes are applied', () => {
      const after = useThen('apply', async () => {
        const before = { fork: await read(forkPath), op: await read(opPath) };
        await applyFix();
        return { before, fork: await read(forkPath), op: await read(opPath) };
      });

      then('the fork gains one review line above its export, which names withLogTrail and (input, context) (#635)', () => {
        const lines = after.fork.split('\n');
        const exportIndex = lines.findIndex((line) =>
          line.startsWith('export const withInputOutputTracing'),
        );
        expect(lines[exportIndex - 1]).toContain('// @declapract:review:');
        expect(lines[exportIndex - 1]).toContain("visualogic's withLogTrail");
        expect(lines[exportIndex - 1]).toContain('(input, context)');
        expect(after.fork.replace(/^.*@declapract:review.*\n/m, '')).toEqual(
          after.before.fork,
        );
        expect(after.fork).toMatchSnapshot('fork — after');
      });

      then('the op gains one review line above its leveled-log import, which names sdk-logs (#643)', () => {
        const lines = after.op.split('\n');
        expect(lines[0]).toContain('// @declapract:review:');
        expect(lines[0]).toContain('sdk-logs');
        expect(after.op.replace(/^.*@declapract:review.*\n/m, '')).toEqual(
          after.before.op,
        );
        expect(after.op).toMatchSnapshot('op — after');
      });
    });

    when('[t2] the fixes are applied a second time (idempotency)', () => {
      const passes = useThen('a second apply over its own output', async () => {
        const before = { fork: await read(forkPath), op: await read(opPath) };
        await applyFix();
        const after = { fork: await read(forkPath), op: await read(opPath) };
        return { before, after };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
