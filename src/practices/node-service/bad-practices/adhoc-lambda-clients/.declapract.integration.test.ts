import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply evaluates the whole practice, so grant a generous limit
jest.setTimeout(300_000);

/**
 * .what = end-to-end proof of the adhoc-lambda-clients marker, through the REAL declapract apply
 *         pipeline against a genTempDir clone of a repo with hand-written and generated clients
 * .why  = a unit test of the transformer never proves the `src/access/sdks/svc*` and
 *         `src/data/clients/svc*` globs match, that `relativeFilePath` reaches the fix, or that a
 *         generated client is left alone on disk (#532)
 */
describe('adhoc-lambda-clients (#532)', () => {
  given('[case1] a repo with two hand-written clients and one generated client', () => {
    const tempDir = genTempDir({
      slug: 'declapract-adhoc-lambda-clients',
      clone:
        './src/practices/node-service/bad-practices/adhoc-lambda-clients/.test/assets/demo-repo-with-adhoc-lambda-clients',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/node-service/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const sdksJobs = 'src/access/sdks/svcJobs.ts';
    const clientsQuotes = 'src/data/clients/svcQuotes.ts';
    const sdksUsers = 'src/access/sdks/svcUsers.ts';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const readAll = async () => ({
      jobs: await read(sdksJobs),
      quotes: await read(clientsQuotes),
      users: await read(sdksUsers),
    });
    const applyAll = async () => {
      for (const file of [sdksJobs, clientsQuotes, sdksUsers])
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'node-service',
          file,
        });
    };

    when('[t0] the input, before any fix', () => {
      then('no client carries a review marker', async () => {
        const before = await readAll();
        expect(before.jobs).not.toContain('@declapract:review');
        expect(before.quotes).not.toContain('@declapract:review');
        expect(before.jobs).toMatchSnapshot('svcJobs.ts — before');
        expect(before.quotes).toMatchSnapshot('svcQuotes.ts — before');
      });
    });

    when('[t1] the node-service practice is applied', () => {
      const afterFirst = useThen('apply each client file', async () => {
        const before = await readAll();
        await applyAll();
        return { before, after: await readAll() };
      });

      then('each hand-written client names the codegen for its own peer', () => {
        expect(afterFirst.after.jobs.split('\n')[0]).toContain(
          'npx sdk-aws-lambda gen --for svc-jobs --into src/access/svcs/ --env prep',
        );
        expect(afterFirst.after.quotes.split('\n')[0]).toContain(
          'npx sdk-aws-lambda gen --for svc-quotes --into src/access/svcs/ --env prep',
        );
        expect(afterFirst.after.jobs).toMatchSnapshot('svcJobs.ts — after');
        expect(afterFirst.after.quotes).toMatchSnapshot('svcQuotes.ts — after');
      });

      then('the client bodies are left as found', () => {
        expect(afterFirst.after.jobs.endsWith(afterFirst.before.jobs)).toBe(true);
        expect(afterFirst.after.quotes.endsWith(afterFirst.before.quotes)).toBe(true);
      });

      then('the generated client is left alone', () => {
        expect(afterFirst.after.users).toEqual(afterFirst.before.users);
      });
    });

    when('[t2] the practice is applied a second time (idempotency)', () => {
      const passes = useThen('a second apply over its own output', async () => {
        const before = await readAll();
        await applyAll();
        return { before, after: await readAll() };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
