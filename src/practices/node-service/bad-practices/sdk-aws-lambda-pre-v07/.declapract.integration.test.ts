import { existsSync } from 'node:fs';
import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

// executeApply evaluates the whole practice, so grant a generous limit
jest.setTimeout(300_000);

/**
 * .what = end-to-end proof of the sdk-aws-lambda-pre-v07 migration, through the REAL declapract
 *         apply pipeline against a genTempDir clone of a repo on sdk-aws-lambda 0.6.2
 * .why  = the fix rewrites handler call forms (#646), drops a below-floor patch key from
 *         package.json and pnpm-workspace.yaml, and deletes the patch file (#670). a unit test of `fix` never proves the
 *         `src/**` glob, the `patches/sdk-aws-lambda@*.patch` glob, or the file deletion on disk.
 */
describe('sdk-aws-lambda-pre-v07 migration', () => {
  given('[case1] a repo on sdk-aws-lambda 0.6.2, with a 0.6.2 patch', () => {
    const tempDir = genTempDir({
      slug: 'declapract-sdk-aws-lambda-pre-v07',
      clone:
        './src/practices/node-service/bad-practices/sdk-aws-lambda-pre-v07/.test/assets/demo-repo-on-sdk-aws-lambda-0.6',
      symlink: [
        {
          at: 'declarations',
          to: './src/.test/assets/node-service/declarations',
        },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    const handlerPath = 'src/contract/handlers/getWidget.ts';
    const patchPath = 'patches/sdk-aws-lambda@0.6.2.patch';
    const workspacePath = 'pnpm-workspace.yaml';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyAll = async () => {
      for (const file of [handlerPath, 'package.json', workspacePath, patchPath])
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'node-service',
          file,
        });
    };

    when('[t0] the input, before any fix', () => {
      then('the handler, package.json, and patch hold the pre-0.7 shapes', async () => {
        const handler = await read(handlerPath);
        const packageJson = await read('package.json');
        expect(handler).toMatch(/genLambdaEndpoint\(/);
        expect(handler).toContain('({ event })');
        expect(packageJson).toContain('"sdk-aws-lambda@0.6.2"');
        expect(existsSync(path.join(tempDir, patchPath))).toBe(true);
        expect(handler).toMatchSnapshot('getWidget.ts — before');
        expect(packageJson).toMatchSnapshot('package.json — before');
      });

      then('the workspace file also keys the 0.6.2 patch', async () => {
        const workspace = await read(workspacePath);
        expect(workspace).toContain('sdk-aws-lambda@0.6.2:');
        expect(workspace).toMatchSnapshot('pnpm-workspace.yaml — before');
      });
    });

    when('[t1] the node-service practice is applied', () => {
      useThen('apply each target file', async () => applyAll());

      then('the handler moves to .forAsk with a payload input', async () => {
        const handler = await read(handlerPath);
        expect(handler).toContain('genLambdaEndpoint.forAsk(');
        expect(handler).toContain(
          'invoke: async ({ payload }) => ({ widgetId: payload.widgetId })',
        );
        expect(handler).not.toMatch(/genLambdaEndpoint\s*\(/);
        expect(handler).toMatchSnapshot('getWidget.ts — after');
      });

      then('the floor lands at 0.7.2, and the stale patch key is gone', async () => {
        const packageJson = await read('package.json');
        const parsed = JSON.parse(packageJson);
        expect(parsed.dependencies['sdk-aws-lambda']).toEqual('0.7.2');
        expect(packageJson).not.toContain('sdk-aws-lambda@0.6.2');
        expect(packageJson).not.toContain('@declapract{');
        expect(packageJson).toMatchSnapshot('package.json — after');
      });

      then('the stale patch file is deleted', () => {
        expect(existsSync(path.join(tempDir, patchPath))).toBe(false);
      });

      then('the workspace drops the stale key and keeps the rest, so no key names a deleted file', async () => {
        const workspace = await read(workspacePath);
        expect(workspace).not.toContain('sdk-aws-lambda@0.6.2');
        expect(workspace).not.toContain('patchedDependencies:');
        expect(workspace).toContain('onlyBuiltDependencies:');
        expect(workspace).toContain('# pnpm 10 reads patchedDependencies');
        expect(workspace).toMatchSnapshot('pnpm-workspace.yaml — after');
      });
    });

    when('[t2] the practice is applied a second time (idempotency)', () => {
      const passes = useThen('a second apply over its own output', async () => {
        const before = {
          handler: await read(handlerPath),
          packageJson: await read('package.json'),
          workspace: await read(workspacePath),
        };
        await applyAll();
        const after = {
          handler: await read(handlerPath),
          packageJson: await read('package.json'),
          workspace: await read(workspacePath),
        };
        return { before, after };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });
});
