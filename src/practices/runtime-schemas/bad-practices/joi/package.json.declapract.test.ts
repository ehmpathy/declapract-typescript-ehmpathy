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
    // #654: the exact zod sdk-aws-lambda pins, never a ^3 caret range
    expect(parsed.dependencies.zod).toBe('4.4.3');
    expect(parsed.dependencies['other-package']).toBe('2.0.0');
    expect(parsed.devDependencies.jest).toBe('29.3.1');
  });

  it('should raise an extant zod below the pinned version (#654: never a ^3 beside a 4)', async () => {
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
    expect(parsed.dependencies.zod).toBe('4.4.3');
  });

  it('should keep an extant zod at or above the pinned version', async () => {
    const contents = JSON.stringify(
      { dependencies: { joi: '17.9.0', zod: '4.5.0' } },
      null,
      2,
    );
    const { contents: fixed } = await fix(contents, {} as any);
    expect(JSON.parse(fixed!).dependencies.zod).toBe('4.5.0');
  });

  it('should be idempotent (a second fix pass is a no-op)', async () => {
    const contents = JSON.stringify(
      { dependencies: { joi: '17.9.0', zod: '^3.20.0' } },
      null,
      2,
    );
    const { contents: once } = await fix(contents, {} as any);
    const { contents: twice } = await fix(once!, {} as any);
    expect(twice).toEqual(once);
  });

  it('should handle empty contents', async () => {
    const { contents: fixed } = await fix(null, {} as any);
    expect(fixed).toBeNull();
  });
});
