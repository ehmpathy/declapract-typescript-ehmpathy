import type { FileFixContext } from 'declapract';

import { fix } from './package.json.declapract';

// .what = a stand-in declapract context for the unit clamps below.
// .why  = `fix` here ignores the context entirely (it reads only `contents`), so the tests
//         pass an empty one. the `as unknown as` is confined to this single documented
//         helper per rule.forbid.as-cast — removable once declapract exports a first-class
//         context test-factory.
const asContext = (): FileFixContext => ({}) as unknown as FileFixContext;

describe('deprecated-test-deps package.json', () => {
  it('should remove deprecated test dependencies', async () => {
    const currentContents = JSON.stringify(
      {
        devDependencies: {
          jest: '29.3.1',
          'babel-jest': '30.0.0',
          '@babel/core': '7.28.0',
          '@babel/preset-env': '7.28.0',
          'core-js': '3.26.0',
          'ts-jest': '29.4.0',
          '@swc/jest': '0.2.39',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(currentContents, asContext());
    const parsed = JSON.parse(fixed!);

    expect(parsed.devDependencies.jest).toBe('29.3.1');
    expect(parsed.devDependencies['@swc/jest']).toBe('0.2.39');
    expect(parsed.devDependencies['babel-jest']).toBeUndefined();
    expect(parsed.devDependencies['@babel/core']).toBeUndefined();
    expect(parsed.devDependencies['@babel/preset-env']).toBeUndefined();
    expect(parsed.devDependencies['core-js']).toBeUndefined();
    expect(parsed.devDependencies['ts-jest']).toBeUndefined();
  });

  it('should not modify file if no deprecated deps present', async () => {
    const currentContents = JSON.stringify(
      {
        devDependencies: {
          jest: '29.3.1',
          '@swc/jest': '0.2.39',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(currentContents, asContext());

    expect(fixed).toBe(currentContents);
  });

  it('should also remove from dependencies if present there', async () => {
    const currentContents = JSON.stringify(
      {
        dependencies: {
          'core-js': '3.26.0',
        },
        devDependencies: {
          jest: '29.3.1',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(currentContents, asContext());
    const parsed = JSON.parse(fixed!);

    expect(parsed.dependencies).toBeUndefined();
    expect(parsed.devDependencies.jest).toBe('29.3.1');
  });

  describe('idempotency (rule.require.idempotent-fixes)', () => {
    it('fix(fix(x)) === fix(x) — the output is a fixed point', async () => {
      const currentContents = JSON.stringify(
        {
          dependencies: { 'core-js': '3.26.0' },
          devDependencies: {
            jest: '29.3.1',
            'babel-jest': '30.0.0',
            'ts-jest': '29.4.0',
            '@swc/jest': '0.2.39',
          },
        },
        null,
        2,
      );

      const { contents: once } = await fix(currentContents, asContext());
      const { contents: twice } = await fix(once!, asContext());

      expect(twice).toEqual(once);
    });

    it('the fixed output holds no deprecated dep — so the CONTAINS check no longer matches and declapract fix cannot loop', async () => {
      const currentContents = JSON.stringify(
        {
          devDependencies: {
            jest: '29.3.1',
            'babel-jest': '30.0.0',
            '@babel/core': '7.28.0',
            '@babel/preset-env': '7.28.0',
            'core-js': '3.26.0',
            'ts-jest': '29.4.0',
          },
        },
        null,
        2,
      );

      const { contents: once } = await fix(currentContents, asContext());
      const parsed = JSON.parse(once!);

      const deprecated = [
        'babel-jest',
        '@babel/core',
        '@babel/preset-env',
        'core-js',
        'ts-jest',
      ];
      for (const dep of deprecated)
        expect(parsed.devDependencies?.[dep]).toBeUndefined();
    });
  });
});
