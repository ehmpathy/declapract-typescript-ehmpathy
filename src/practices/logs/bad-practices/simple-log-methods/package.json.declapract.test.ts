import { fix } from './package.json.declapract';

describe('simple-log-methods bad-practice package.json', () => {
  it('should remove simple-log-methods from dependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          'simple-log-methods': '0.6.9',
          'domain-objects': '0.31.9',
        },
      },
      null,
      2,
    );

    const result = await fix(contents, {} as any);
    const parsed = JSON.parse(result.contents!);

    expect(parsed.dependencies['simple-log-methods']).toBeUndefined();
    expect(parsed.dependencies['domain-objects']).toBe('0.31.9');
  });
});
