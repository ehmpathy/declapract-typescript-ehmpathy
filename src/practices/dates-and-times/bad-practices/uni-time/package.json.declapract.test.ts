import { fix } from './package.json.declapract';

describe('uni-time bad practice package.json', () => {
  it('should remove @ehmpathy/uni-time from dependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          '@ehmpathy/uni-time': '1.0.0',
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

    expect(parsed.dependencies['@ehmpathy/uni-time']).toBeUndefined();
    expect(parsed.dependencies['other-package']).toBe('2.0.0');
    expect(parsed.devDependencies.jest).toBe('29.3.1');
  });

  it('should remove @ehmpathy/uni-time from devDependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          'other-package': '2.0.0',
        },
        devDependencies: {
          '@ehmpathy/uni-time': '1.0.0',
          jest: '29.3.1',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.devDependencies['@ehmpathy/uni-time']).toBeUndefined();
    expect(parsed.devDependencies.jest).toBe('29.3.1');
    expect(parsed.dependencies['other-package']).toBe('2.0.0');
  });

  it('should remove @ehmpathy/uni-time from both dependencies and devDependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          '@ehmpathy/uni-time': '1.0.0',
        },
        devDependencies: {
          '@ehmpathy/uni-time': '1.0.0',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.dependencies['@ehmpathy/uni-time']).toBeUndefined();
    expect(parsed.devDependencies['@ehmpathy/uni-time']).toBeUndefined();
  });

  // #642: the src fix rewrites every import to iso-time, so the dep must land where uni-time sat
  it('should add iso-time to dependencies where @ehmpathy/uni-time sat', async () => {
    const contents = JSON.stringify(
      { dependencies: { '@ehmpathy/uni-time': '1.10.0', lodash: '4.0.0' } },
      null,
      2,
    );
    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);
    expect(parsed.dependencies['iso-time']).toBe('1.11.7');
    expect(parsed.dependencies['@ehmpathy/uni-time']).toBeUndefined();
    expect(parsed.devDependencies).toBeUndefined();
    expect(fixed).toMatchSnapshot('fixed package.json — dependencies');
  });

  it('should add iso-time to devDependencies where @ehmpathy/uni-time sat only there', async () => {
    const contents = JSON.stringify(
      {
        dependencies: { lodash: '4.0.0' },
        devDependencies: { '@ehmpathy/uni-time': '1.10.0' },
      },
      null,
      2,
    );
    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);
    expect(parsed.devDependencies['iso-time']).toBe('1.11.7');
    expect(parsed.dependencies['iso-time']).toBeUndefined();
  });

  it('should keep an extant iso-time version', async () => {
    const contents = JSON.stringify(
      { dependencies: { '@ehmpathy/uni-time': '1.10.0', 'iso-time': '1.12.0' } },
      null,
      2,
    );
    const { contents: fixed } = await fix(contents, {} as any);
    expect(JSON.parse(fixed!).dependencies['iso-time']).toBe('1.12.0');
  });

  it('should be idempotent (a second fix pass is a no-op)', async () => {
    const contents = JSON.stringify(
      { dependencies: { '@ehmpathy/uni-time': '1.10.0' } },
      null,
      2,
    );
    const { contents: once } = await fix(contents, {} as any);
    const { contents: twice } = await fix(once!, {} as any);
    expect(twice).toEqual(once);
  });
});
