import { fix } from './package.json.declapract';

describe('bottleneck bad-practice package.json', () => {
  it('should replace bottleneck with with-bottleneck in dependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          bottleneck: '2.19.5',
          'domain-objects': '0.31.9',
        },
      },
      null,
      2,
    );

    const result = await fix(contents, {} as any);
    const parsed = JSON.parse(result.contents!);

    expect(parsed.dependencies.bottleneck).toBeUndefined();
    expect(parsed.dependencies['with-bottleneck']).toBe('2.19.5');
    expect(parsed.dependencies['domain-objects']).toBe('0.31.9');
  });
});
