import { given, then, when } from 'test-fns';

import { check, fix } from './best-practice/package.json.declapract';

// this check/fix reads only `contents`, never the context arg; `{}` is an empty
// placeholder for the unused second arg (howto.add-best-practice.md).
const ctx = {} as any;

const pkg = (deps: Record<string, string>): string =>
  JSON.stringify({ name: 'app', devDependencies: deps }, null, 2);

describe('tests-expo package.json — jest-expo/rtr major gated on the repo expo/react major', () => {
  given('[case1] an expo-54 / react-19 repo whose toolchain already matches', () => {
    const contents = pkg({
      expo: '^54.0.0',
      react: '^19.0.0',
      'jest-expo': '^54.0.0',
      'react-test-renderer': '^19.0.0',
      '@babel/core': '^7.24.0',
      'babel-preset-expo': '^12.0.0',
      'isomorphic-fetch': '^3.0.0',
    });

    when('[t0] checked', () => {
      then('it passes (check returns)', () => {
        expect(() => check(contents, ctx)).not.toThrow();
      });
    });
  });

  given('[case2] an expo-51 / react-18 repo seeded with a react-19-era jest-expo 54 the gate aligns down to the expo major (51)', () => {
    const contents = pkg({
      expo: '~51.0.0',
      react: '18.2.0',
      'jest-expo': '^54.0.0', // the crash: a react-19-era preset on a react-18 repo
      'react-test-renderer': '^19.0.0',
      'babel-preset-expo': '^12.0.0',
      'isomorphic-fetch': '^3.0.0',
    });

    when('[t0] checked', () => {
      then('it is flagged (check throws — major mismatch)', () => {
        expect(() => check(contents, ctx)).toThrow('jest-expo major');
      });
    });

    when('[t1] fixed', () => {
      then('jest-expo is held at the repo expo major (51), rtr at the react major (18)', () => {
        const fixed = JSON.parse(fix(contents, ctx).contents!);
        expect(fixed.devDependencies['jest-expo']).toEqual('^51.0.0');
        expect(fixed.devDependencies['react-test-renderer']).toEqual('^18.0.0');
      });

      then('the fixed output passes the check', () => {
        const fixed = fix(contents, ctx).contents!;
        expect(() => check(fixed, ctx)).not.toThrow();
      });
    });
  });

  given('[case3] an expo-51 / react-18 repo already on the SDK-matched majors', () => {
    const contents = pkg({
      expo: '~51.0.0',
      react: '18.2.0',
      'jest-expo': '^51.0.0',
      'react-test-renderer': '^18.0.0',
      '@babel/core': '^7.24.0',
      'babel-preset-expo': '^12.0.0',
      'isomorphic-fetch': '^3.0.0',
    });

    when('[t0] checked', () => {
      then('it passes — the gate never forces a react-19 bump onto react-18', () => {
        expect(() => check(contents, ctx)).not.toThrow();
      });
    });
  });

  given('[case4] a package.json with no expo dep', () => {
    const contents = pkg({ react: '^18.0.0', jest: '^29.0.0' });

    when('[t0] checked', () => {
      then('it passes (not an expo repo in a gate-able state)', () => {
        expect(() => check(contents, ctx)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('it is left untouched', () => {
        expect(fix(contents, ctx).contents).toEqual(contents);
      });
    });
  });

  given('[case5] an expo-54 repo whose babel-preset-expo is below the minimum', () => {
    const contents = pkg({
      expo: '^54.0.0',
      react: '^19.0.0',
      'jest-expo': '^54.0.0',
      'react-test-renderer': '^19.0.0',
      '@babel/core': '^7.24.0',
      'babel-preset-expo': '^11.0.0', // below 12
      'isomorphic-fetch': '^3.0.0',
    });

    when('[t0] checked', () => {
      then('it is flagged (babel-preset-expo floor)', () => {
        expect(() => check(contents, ctx)).toThrow('babel-preset-expo');
      });
    });

    when('[t1] fixed', () => {
      then('babel-preset-expo is raised to its minimum', () => {
        const fixed = JSON.parse(fix(contents, ctx).contents!);
        expect(fixed.devDependencies['babel-preset-expo']).toEqual('^12.0.0');
      });
    });
  });

  given('[case7] an expo-54 repo whose @babel/core is below the minimum', () => {
    const contents = pkg({
      expo: '^54.0.0',
      react: '^19.0.0',
      'jest-expo': '^54.0.0',
      'react-test-renderer': '^19.0.0',
      '@babel/core': '^7.23.0', // below 7.24
      'babel-preset-expo': '^12.0.0',
      'isomorphic-fetch': '^3.0.0',
    });

    when('[t0] checked', () => {
      then('it is flagged (@babel/core floor — coverage the pre-gate template kept)', () => {
        expect(() => check(contents, ctx)).toThrow('@babel/core');
      });
    });

    when('[t1] fixed', () => {
      then('@babel/core is raised to its minimum', () => {
        const fixed = JSON.parse(fix(contents, ctx).contents!);
        expect(fixed.devDependencies['@babel/core']).toEqual('^7.24.0');
      });
    });
  });

  given('[case8] jest-expo duplicated across dependencies (wrong major) + devDependencies', () => {
    // the merged getAllDeps check reads dev-wins, so a stale `dependencies` copy at a wrong major is
    // invisible to check — but npm installs ONE version and the prod-deps copy can win at install
    // time (r006.b1 two-section conflict). the fix must strip the test-time deps from `dependencies`.
    const contents = JSON.stringify(
      {
        name: 'app',
        dependencies: {
          'jest-expo': '^51.0.0', // stale, wrong-major copy in prod deps
          'some-runtime-dep': '^1.0.0', // an unrelated prod dep — must survive
        },
        devDependencies: {
          expo: '^54.0.0',
          react: '^19.0.0',
          'jest-expo': '^54.0.0',
          'react-test-renderer': '^19.0.0',
          '@babel/core': '^7.24.0',
          'babel-preset-expo': '^12.0.0',
          'isomorphic-fetch': '^3.0.0',
        },
      },
      null,
      2,
    );

    when('[t0] fixed', () => {
      then('jest-expo is removed from dependencies (no two-section conflict) and pinned in devDependencies', () => {
        const fixed = JSON.parse(fix(contents, ctx).contents!);
        // teeth: drop the `delete dependencies['jest-expo']` line in fix and this reddens — the
        // stale prod-deps copy survives at ^51 while devDependencies holds ^54 (a real conflict).
        expect(fixed.dependencies['jest-expo']).toBeUndefined();
        expect(fixed.devDependencies['jest-expo']).toEqual('^54.0.0');
      });

      then('the unrelated prod dep + the dependencies section are preserved', () => {
        const fixed = JSON.parse(fix(contents, ctx).contents!);
        expect(fixed.dependencies['some-runtime-dep']).toEqual('^1.0.0');
      });

      then('the fixed output passes the check', () => {
        const fixed = fix(contents, ctx).contents!;
        expect(() => check(fixed, ctx)).not.toThrow();
      });
    });
  });

  given('[case6] idempotency', () => {
    const contents = pkg({
      expo: '~51.0.0',
      react: '18.2.0',
      'jest-expo': '^54.0.0',
      'react-test-renderer': '^19.0.0',
      'babel-preset-expo': '^11.0.0',
      'isomorphic-fetch': '^3.0.0',
    });

    when('[t0] fix is applied twice', () => {
      then('the second pass equals the first, and check passes on the fixed output', () => {
        const once = fix(contents, ctx).contents!;
        const twice = fix(once, ctx).contents!;
        expect(twice).toEqual(once);
        expect(() => check(once, ctx)).not.toThrow();
      });
    });
  });
});
