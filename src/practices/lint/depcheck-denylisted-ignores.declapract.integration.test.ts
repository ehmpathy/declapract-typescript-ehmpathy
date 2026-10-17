import fs from 'node:fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';
import yaml from 'yaml';

import { check as checkOfDenylist } from './bad-practices/depcheck-denylisted-ignores/.depcheckrc.yml.declapract';

// executeApply evaluates the whole lint practice before the `file` filter narrows it
jest.setTimeout(5 * 60 * 1000);

const DENYLISTED_IN_FIXTURE = ['date-fns', 'ts-node', 'core-js'];

/**
 * .what = proves the depcheck-denylisted-ignores bad practice through the real pipeline
 * .why  = the unit suite proves the fix in isolation; only executeApply proves the bad-practice
 *         path matches the repo-root `.depcheckrc.yml`, the check gates the fix, the removal
 *         composes with the best-practice merge on the same file, and a rerun settles
 *         (rule.require.declapract-integration-tests, rule.require.idempotent-fixes)
 * .note = this file sits at the practice ROOT, never directly under `bad-practices/`, where
 *         declapract would fail to extract a bad-practice name
 * .note = each `{} as any` context is a documented cast (rule.forbid.as-cast): this check reads
 *         only its contents, never a context field. removal path: a declapract partial-context builder
 */
describe('lint depcheck-denylisted-ignores', () => {
  given('[case1] a node repo whose .depcheckrc.yml ignores denylisted packages', () => {
    const tempDir = genTempDir({
      slug: 'lint-depcheckrc-denylisted',
      clone: './src/practices/lint/.test/assets/repo-depcheckrc-denylisted',
      symlink: [{ at: 'declarations', to: './src/.test/assets/lint/declarations' }],
    });
    const read = () =>
      fs.readFile(path.join(tempDir, '.depcheckrc.yml'), 'utf-8');
    const apply = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: '.depcheckrc.yml',
      });

    when('[t0] before any apply', () => {
      then('the bad practice is detected on the input', async () => {
        expect(() => checkOfDenylist(null, {} as any)).toThrow();
        const before = await read();
        expect(() => checkOfDenylist(before, {} as any)).not.toThrow();
      });

      then('the input file matches snapshot', async () => {
        expect(await read()).toMatchSnapshot('.depcheckrc.yml — before');
      });
    });

    when('[t1] apply runs', () => {
      const scene = useThen('apply settles', async () => {
        await apply();
        const after = await read();
        const parsed = yaml.parse(after) as {
          ignores: string[];
          ignorePatterns: string[];
        };
        return { after, ignores: parsed.ignores, ignorePatterns: parsed.ignorePatterns };
      });

      then('every denylisted ignore is gone', () => {
        DENYLISTED_IN_FIXTURE.forEach((name) =>
          expect(scene.ignores).not.toContain(name),
        );
      });

      then('the declared ignores and ignorePatterns are present', () => {
        expect(scene.ignores).toContain('rhachet*');
        expect(scene.ignores).toContain('declapract');
        expect(scene.ignores).toContain('yaml');
        expect(scene.ignorePatterns).toContain('.agent/.actors');
        expect(scene.ignorePatterns).toContain('!.agent/repo=.this');
      });

      then('the repo-own ignores survive, with their comments', () => {
        expect(scene.ignores).toContain('my-own-dep');
        expect(scene.ignores).toContain('@src/*');
        expect(scene.after).toContain('# repo-own header comment');
        expect(scene.after).toContain('# repo-own reason for a repo-own ignore');
      });

      then('the bad practice is no longer detected on the settled file', () => {
        expect(() => checkOfDenylist(scene.after, {} as any)).toThrow(
          'no denylisted packages found in ignores',
        );
      });

      then('no declapract template syntax leaked', () => {
        expect(scene.after).not.toContain('@declapract{');
      });

      then('the output matches snapshot', () => {
        expect(scene.after).toMatchSnapshot('.depcheckrc.yml — after');
      });
    });

    when('[t2] apply runs a second time', () => {
      const before = useBeforeAll(async () => ({ contents: await read() }));
      const scene = useThen('apply again', async () => {
        await apply();
        return { after: await read() };
      });

      then('the file is byte-identical — the apply is a fixed point', () => {
        expect(scene.after).toEqual(before.contents);
      });
    });
  });
});
