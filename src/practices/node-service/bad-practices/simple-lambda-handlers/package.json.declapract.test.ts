import { fix } from './package.json.declapract';

describe('simple-lambda-handlers package.json', () => {
  it('should remove simple-lambda-handlers from dependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          'simple-lambda-handlers': '1.0.0',
          'other-package': '2.0.0',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.dependencies['simple-lambda-handlers']).toBeUndefined();
    expect(parsed.dependencies['other-package']).toBe('2.0.0');
  });

  it('should add sdk-aws-lambda to dependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          'simple-lambda-handlers': '1.0.0',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.dependencies['sdk-aws-lambda']).toBe('^0.1.0');
  });

  it('should preserve extant sdk-aws-lambda version if present', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          'simple-lambda-handlers': '1.0.0',
          'sdk-aws-lambda': '^0.5.0',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.dependencies['sdk-aws-lambda']).toBe('^0.5.0');
  });
});
