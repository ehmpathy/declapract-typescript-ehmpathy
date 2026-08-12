import { given, then, when } from 'test-fns';

import { check, fix } from './package.json.declapract';

// this check/fix reads only `contents`, never the context arg; `{}` is an empty
// placeholder for the unused second arg. the cast is the sanctioned test-context idiom
// (howto.add-bad-practice.md); removal path: drop it if declapract exports a context stub.
const ctx = {} as any;

describe('pnpm npm-overrides bad-practice', () => {
  given('[case1] a package.json with npm `overrides` + yarn `resolutions`', () => {
    const contents = JSON.stringify(
      {
        name: 'app',
        overrides: { 'react-refresh': '~0.14.0' },
        resolutions: { 'react-refresh': '~0.14.0' },
      },
      null,
      2,
    );

    when('[t0] checked', () => {
      then('it is detected (check returns)', () => {
        expect(() => check(contents, ctx)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('it relocates both into pnpm.overrides and drops the old keys', async () => {
        const { contents: fixed } = await fix(contents, ctx);
        const pkg = JSON.parse(fixed!);
        expect(pkg.pnpm.overrides['react-refresh']).toEqual('~0.14.0');
        expect(pkg.overrides).toBeUndefined();
        expect(pkg.resolutions).toBeUndefined();
        expect(pkg.name).toEqual('app'); // untouched
      });
    });
  });

  given('[case2] a package.json ONLY on top-level npm `overrides`', () => {
    const contents = JSON.stringify(
      { name: 'app', overrides: { foo: '1.0.0' } },
      null,
      2,
    );

    when('[t0] fixed', () => {
      then('foo lands under pnpm.overrides', async () => {
        const { contents: fixed } = await fix(contents, ctx);
        const pkg = JSON.parse(fixed!);
        expect(pkg.pnpm.overrides.foo).toEqual('1.0.0');
        expect(pkg.overrides).toBeUndefined();
      });
    });
  });

  given('[case3] a package.json whose pre-extant pnpm.overrides collides with npm `overrides`', () => {
    const contents = JSON.stringify(
      {
        name: 'app',
        overrides: { foo: '2.0.0' }, // npm — wins
        pnpm: { overrides: { foo: '1.0.0', bar: '9.9.9' } },
      },
      null,
      2,
    );

    when('[t0] fixed', () => {
      then('npm `overrides` wins the collision, other pnpm pins survive', async () => {
        const { contents: fixed } = await fix(contents, ctx);
        const pkg = JSON.parse(fixed!);
        expect(pkg.pnpm.overrides.foo).toEqual('2.0.0'); // npm won
        expect(pkg.pnpm.overrides.bar).toEqual('9.9.9'); // survived
        expect(pkg.overrides).toBeUndefined();
      });
    });
  });

  given('[case4] a package.json already pnpm-shaped (no top-level keys)', () => {
    const contents = JSON.stringify(
      { name: 'app', pnpm: { overrides: { foo: '1.0.0' } } },
      null,
      2,
    );

    when('[t0] checked', () => {
      then('it is NOT detected (check throws)', () => {
        expect(() => check(contents, ctx)).toThrow('does not match bad practice');
      });
    });
  });

  given('[case6] a NESTED per-dependency npm override pnpm cannot express', () => {
    // the nested form ({ ".": "...", "dep": "..." }) has no flat pnpm.overrides equivalent.
    // a silent pass-through would emit a config pnpm rejects — a failhide. the fix must FAIL FAST.
    const contents = JSON.stringify(
      {
        name: 'app',
        overrides: {
          'flat-pkg': '1.2.3',
          'nested-pkg': { '.': '1.0.0', 'sub-dep': '2.0.0' },
        },
      },
      null,
      2,
    );

    when('[t0] fixed', () => {
      then('it fails fast (throws), and names the at-fault key and the fix', () => {
        expect(() => fix(contents, ctx)).toThrow('NESTED');
        expect(() => fix(contents, ctx)).toThrow('nested-pkg');
      });

      then('it does NOT silently emit a config pnpm would reject', () => {
        // proof of the anti-failhide: no output is produced for the un-migratable shape
        let emitted: string | null | undefined;
        try {
          emitted = fix(contents, ctx).contents;
        } catch {
          emitted = 'THREW';
        }
        expect(emitted).toEqual('THREW');
      });
    });
  });

  given('[case5] idempotency — the fixed output is a fixed point', () => {
    const contents = JSON.stringify(
      {
        name: 'app',
        overrides: { 'react-refresh': '~0.14.0' },
        resolutions: { 'react-refresh': '~0.14.0' },
      },
      null,
      2,
    );

    when('[t0] fix is applied twice', () => {
      then('the second pass equals the first (no change)', async () => {
        const once = (await fix(contents, ctx)).contents!;
        const twice = (await fix(once, ctx)).contents!;
        expect(twice).toEqual(once);
      });

      then('and check throws on the fixed output (bad pattern gone)', async () => {
        const once = (await fix(contents, ctx)).contents!;
        expect(() => check(once, ctx)).toThrow('does not match bad practice');
      });
    });
  });
});
