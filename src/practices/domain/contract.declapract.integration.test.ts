import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply is slow (full practice evaluation), so grant a generous limit
jest.setTimeout(180_000);

/**
 * .what = end-to-end proof of the `X.contract()` migration (#565, #634), through the REAL apply.
 * .why  = `schema-over-contract` rewrites each published `X.schema` / bare `X.contract` to
 *   `X.contract()`, and must leave internal `.schema.safeParse` alone. only the pipeline proves the
 *   declared glob reaches the handler.
 * .note = the handler is snapshotted before AND after.
 */
describe('domain X.contract() migration', () => {
  given('[case1] a repo whose handler refers to dobjs via .schema and a bare .contract', () => {
    const tempDir = genTempDir({
      slug: 'declapract-domain-contract',
      clone: './src/.test/assets/domain-contract/repo-with-contract',
      symlink: [
        { at: 'declarations', to: './src/.test/assets/domain-contract/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const handlerPath = 'src/contract/handlers/getChatThread.ts';
    const readHandler = () => fs.readFile(path.join(tempDir, handlerPath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'domain',
        file: handlerPath,
      });

    when('[t0] the fix is applied, then applied again', () => {
      const result = useThen('apply twice', async () => {
        const before = await readHandler();
        await applyFix();
        const once = await readHandler();
        await applyFix();
        const twice = await readHandler();
        return { before, once, twice };
      });

      then('the handler refers to each dobj via X.contract(), and keeps internal .schema.safeParse', () => {
        expect(result.once).toContain("thread: ChatThread.contract().ref('primary'),");
        expect(result.once).toContain('thread: ChatThread.contract().nullable(),');
        expect(result.once).toContain('z.array(Transmission.contract())');
        expect(result.once).toContain('ChatThread.schema.safeParse(input)');
        expect(result.before).toMatchSnapshot('getChatThread.ts — before');
        expect(result.once).toMatchSnapshot('getChatThread.ts — after');
      });

      then('the second apply is a no-op', () => {
        expect(result.twice).toEqual(result.once);
      });
    });
  });
});
