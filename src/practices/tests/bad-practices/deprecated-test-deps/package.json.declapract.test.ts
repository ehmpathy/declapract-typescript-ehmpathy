import { fix } from './package.json.declapract';

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

    const { contents: fixed } = await fix(currentContents, {} as any);
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

    const { contents: fixed } = await fix(currentContents, {} as any);

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

    const { contents: fixed } = await fix(currentContents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.dependencies).toBeUndefined();
    expect(parsed.devDependencies.jest).toBe('29.3.1');
  });
});
