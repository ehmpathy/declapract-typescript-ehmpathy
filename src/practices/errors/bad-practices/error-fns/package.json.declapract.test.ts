import { fix } from './package.json.declapract';

describe('error-fns bad practice package.json', () => {
  it('should remove @ehmpathy/error-fns from dependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          '@ehmpathy/error-fns': '1.0.0',
          'other-package': '2.0.0',
        },
        devDependencies: {
          jest: '29.3.1',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.dependencies['@ehmpathy/error-fns']).toBeUndefined();
    expect(parsed.dependencies['other-package']).toBe('2.0.0');
    expect(parsed.devDependencies.jest).toBe('29.3.1');
  });

  it('should remove @ehmpathy/error-fns from devDependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          'other-package': '2.0.0',
        },
        devDependencies: {
          '@ehmpathy/error-fns': '1.0.0',
          jest: '29.3.1',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.devDependencies['@ehmpathy/error-fns']).toBeUndefined();
    expect(parsed.devDependencies.jest).toBe('29.3.1');
    expect(parsed.dependencies['other-package']).toBe('2.0.0');
  });

  it('should remove @ehmpathy/error-fns from both dependencies and devDependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          '@ehmpathy/error-fns': '1.0.0',
        },
        devDependencies: {
          '@ehmpathy/error-fns': '1.0.0',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.dependencies['@ehmpathy/error-fns']).toBeUndefined();
    expect(parsed.devDependencies['@ehmpathy/error-fns']).toBeUndefined();
  });
});
