import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = proves through the real apply pipeline that a package.json with an implicit `private`
 *         gains an explicit `"private": true`, and that a second apply is a no-op
 * .why = provision-github fails closed on repo visibility; the key must always be explicit, so the
 *        visibility a repo provisions with is the visibility its package.json declares
 * .teeth = let the fix skip an absent key and [t1] stays without `private`
 */
jest.setTimeout(5 * 60 * 1000);

describe('provision-github implicit-package-privacy', () => {
  given('[case1] a repo whose package.json omits private', () => {
    const tempDir = genTempDir({
      slug: 'declapract-provision-github-implicit-privacy',
      clone:
        './src/practices/provision-github/.test/assets/demo-repo-implicit-privacy',
      symlink: [{ at: 'declarations', to: 'src' }],
    });
    const read = () => fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');
    const apply = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'provision-github',
        file: 'package.json',
      });

    when('[t0] the input, before any fix', () => {
      then('package.json has no private key', async () => {
        const before = await read();
        expect(JSON.parse(before)).not.toHaveProperty('private');
        expect(before).toMatchSnapshot('package.json — before');
      });
    });

    when('[t1] apply runs', () => {
      useThen('apply the declarations', async () => apply());

      then('package.json declares private: true, before version', async () => {
        const after = await read();
        const pkg = JSON.parse(after);
        expect(pkg.private).toEqual(true);
        const keys = Object.keys(pkg);
        expect(keys.indexOf('private')).toEqual(keys.indexOf('version') - 1);
        expect(pkg.scripts).toEqual({ build: 'tsc' });
        expect(after.endsWith('}\n')).toEqual(true);
        expect(after).toMatchSnapshot('package.json — after');
      });
    });

    when('[t2] apply runs a second time', () => {
      const scene = useThen('apply again', async () => {
        const before = await read();
        await apply();
        const after = await read();
        return { before, after };
      });

      then('package.json is a fixed point', () => {
        expect(scene.after).toEqual(scene.before);
      });
    });
  });
});
