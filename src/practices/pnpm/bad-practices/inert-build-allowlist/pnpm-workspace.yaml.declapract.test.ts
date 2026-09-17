import { given, then, when } from 'test-fns';

import { check, fix } from './pnpm-workspace.yaml.declapract';

// this check/fix reads only `contents`, never the context arg; `{}` is an empty
// placeholder for the unused second arg. the cast is the sanctioned test-context idiom
// (howto.add-bad-practice.md); removal path: drop it if declapract exports a context stub.
const ctx = {} as any;

describe('pnpm inert-build-allowlist bad-practice', () => {
  given('[case1] a pnpm-workspace.yaml whose SOLE content is an allowBuilds block', () => {
    const contents = ['allowBuilds:', '  esbuild: true', '  node-pty: true', ''].join('\n');

    when('[t0] checked', () => {
      then('it is detected (check returns)', () => {
        expect(() => check(contents, ctx)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('the whole file is deleted (contents null)', async () => {
        const { contents: fixed } = await fix(contents, ctx);
        expect(fixed).toBeNull();
      });
    });
  });

  given('[case2] a pnpm-workspace.yaml with allowBuilds AND another key', () => {
    const contents = [
      'packages:',
      '  - packages/*',
      'allowBuilds:',
      '  esbuild: true',
      '  node-pty: true',
      '',
    ].join('\n');

    when('[t0] checked', () => {
      then('it is detected (check returns)', () => {
        expect(() => check(contents, ctx)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('the allowBuilds block is stripped, the other key survives', async () => {
        const { contents: fixed } = await fix(contents, ctx);
        expect(fixed).not.toBeNull();
        expect(fixed).toContain('packages:');
        expect(fixed).toContain('- packages/*');
        expect(fixed).not.toContain('allowBuilds');
        expect(fixed).not.toContain('esbuild');
        expect(fixed).not.toContain('node-pty');
      });
    });
  });

  given('[case3] a pnpm-workspace.yaml with NO allowBuilds key', () => {
    const contents = ['packages:', '  - packages/*', ''].join('\n');

    when('[t0] checked', () => {
      then('it is NOT detected (check throws)', () => {
        expect(() => check(contents, ctx)).toThrow('does not match bad practice');
      });
    });
  });

  given('[case4] an absent file (contents null)', () => {
    when('[t0] checked', () => {
      then('it is NOT detected (check throws)', () => {
        expect(() => check(null, ctx)).toThrow('does not match bad practice');
      });
    });
  });

  given('[case5] idempotency — the fixed output is a fixed point', () => {
    when('[t0] the sole-content file is fixed twice', () => {
      then('the first pass deletes it, so no file is left to re-fix', async () => {
        const contents = ['allowBuilds:', '  esbuild: true', ''].join('\n');
        const once = (await fix(contents, ctx)).contents;
        expect(once).toBeNull();
        // a deleted file re-enters check as null → not detected → no-op
        expect(() => check(once ?? null, ctx)).toThrow('does not match bad practice');
      });
    });

    when('[t1] the multi-key file is fixed twice', () => {
      then('the second pass equals the first, and check throws on it', async () => {
        const contents = [
          'packages:',
          '  - packages/*',
          'allowBuilds:',
          '  esbuild: true',
          '',
        ].join('\n');
        const once = (await fix(contents, ctx)).contents!;
        const twice = (await fix(once, ctx)).contents!;
        expect(twice).toEqual(once);
        expect(() => check(once, ctx)).toThrow('does not match bad practice');
      });
    });
  });
});
