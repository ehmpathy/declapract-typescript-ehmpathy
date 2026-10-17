import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { genTempDir, given, then, when } from 'test-fns';

import { check, fix } from './package.json.declapract';

const asPackageJson = (dependencies: Record<string, string>): string =>
  JSON.stringify({ dependencies }, null, 2);

/**
 * .what = a check/fix context rooted at a temp repo, with each named code file written into it.
 * .why  = the fix reads the repo to know whether a live import of bottleneck remains (F42); only a
 *         real root proves that read.
 */
const genRepoContext = (input: {
  slug: string;
  codeFiles: Record<string, string>;
}) => {
  const root = genTempDir({ slug: input.slug });
  Object.entries(input.codeFiles).forEach(([relativePath, source]) => {
    mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
    writeFileSync(path.join(root, relativePath), source);
  });
  return { getProjectRootDirectory: () => root } as any; // a partial check context: only the root is read
};

describe('bottleneck bad-practice package.json', () => {
  given('[case1] bottleneck@2.x, no import of it anywhere (#663)', () => {
    const before = asPackageJson({
      bottleneck: '2.19.5',
      'domain-objects': '0.31.9',
    });
    const context = genRepoContext({
      slug: 'bottleneck-case1',
      codeFiles: { 'src/index.ts': "import { withBottleneck } from 'with-bottleneck';\n" },
    });

    when('[t0] the fix runs', () => {
      then('with-bottleneck is pinned at a published version, never the bottleneck copy', async () => {
        const after = (await fix(before, context)).contents!;
        const parsed = JSON.parse(after);
        expect(parsed.dependencies['with-bottleneck']).toBe('0.1.2');
        expect(parsed.dependencies.bottleneck).toBeUndefined();
        expect(parsed.dependencies['domain-objects']).toBe('0.31.9');
        expect(before).toMatchSnapshot('package.json — before');
        expect(after).toMatchSnapshot('package.json — after');
      });

      then('the check passes on the fixed output, and a second pass is a no-op', async () => {
        const once = (await fix(before, context)).contents!;
        const twice = (await fix(once, context)).contents!;
        expect(twice).toEqual(once);
        expect(() => check(once, context)).toThrow('does not match bad practice');
      });
    });
  });

  given('[case2] a with-bottleneck pin copied from bottleneck by the prior fix', () => {
    const before = asPackageJson({ 'with-bottleneck': '2.19.5' });
    const context = genRepoContext({ slug: 'bottleneck-case2', codeFiles: {} });

    then('the check detects it (a bad-practice check returns on detection)', () => {
      expect(() => check(before, context)).not.toThrow();
    });

    then('the fix repins it at a published version', async () => {
      const parsed = JSON.parse((await fix(before, context)).contents!);
      expect(parsed.dependencies['with-bottleneck']).toBe('0.1.2');
    });
  });

  given('[case3] a valid with-bottleneck pin and no bottleneck', () => {
    const context = genRepoContext({ slug: 'bottleneck-case3', codeFiles: {} });

    then('the check skips it', () => {
      expect(() =>
        check(asPackageJson({ 'with-bottleneck': '0.1.1' }), context),
      ).toThrow('does not match bad practice');
    });
  });

  given('[case4] bottleneck@2.x, imported only from a code dir outside src (F42)', () => {
    const before = asPackageJson({
      bottleneck: '2.19.5',
      'with-bottleneck': '2.19.5',
    });
    const context = genRepoContext({
      slug: 'bottleneck-case4',
      codeFiles: {
        'provision/aws/limiter.ts': "import Bottleneck from 'bottleneck';\n",
      },
    });

    when('[t0] the fix runs', () => {
      then('bottleneck stays, since a live import remains, and the copied pin is repaired', async () => {
        const once = (await fix(before, context)).contents!;
        const parsed = JSON.parse(once);
        expect(parsed.dependencies.bottleneck).toBe('2.19.5');
        expect(parsed.dependencies['with-bottleneck']).toBe('0.1.2');
        expect(once).toMatchSnapshot('package.json — after');
      });

      then('a second pass is a no-op, and the check no longer flags it', async () => {
        const once = (await fix(before, context)).contents!;
        const twice = (await fix(once, context)).contents!;
        expect(twice).toEqual(once);
        expect(() => check(once, context)).toThrow('does not match bad practice');
      });
    });
  });
});
