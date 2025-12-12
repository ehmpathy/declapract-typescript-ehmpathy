import { fix } from './package.json.declapract';

describe('joi bad practice package.json', () => {
  it('should remove joi from dependencies and add zod', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          joi: '17.9.0',
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

    expect(parsed.dependencies.joi).toBeUndefined();
    expect(parsed.dependencies.zod).toBe('^3.24.0');
    expect(parsed.dependencies['other-package']).toBe('2.0.0');
    expect(parsed.devDependencies.jest).toBe('29.3.1');
  });

  it('should preserve existing zod version if already present', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          joi: '17.9.0',
          zod: '^3.20.0',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.dependencies.joi).toBeUndefined();
    expect(parsed.dependencies.zod).toBe('^3.20.0');
  });

  it('should handle empty contents', async () => {
    const { contents: fixed } = await fix(null, {} as any);
    expect(fixed).toBeNull();
  });
});
