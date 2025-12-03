import { fix } from './package.json.declapract';

describe('commitlint bad practice package.json', () => {
  it('should remove commitlint from devDependencies', async () => {
    const contents = JSON.stringify(
      {
        devDependencies: {
          commitlint: '17.0.0',
          '@commitlint/cli': '19.5.0',
          jest: '29.3.1',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.devDependencies.commitlint).toBeUndefined();
    expect(parsed.devDependencies['@commitlint/cli']).toBe('19.5.0');
    expect(parsed.devDependencies.jest).toBe('29.3.1');
  });

  it('should not modify file if commitlint not present', async () => {
    const contents = JSON.stringify(
      {
        devDependencies: {
          '@commitlint/cli': '19.5.0',
          jest: '29.3.1',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    expect(parsed.devDependencies['@commitlint/cli']).toBe('19.5.0');
    expect(parsed.devDependencies.jest).toBe('29.3.1');
  });
});
