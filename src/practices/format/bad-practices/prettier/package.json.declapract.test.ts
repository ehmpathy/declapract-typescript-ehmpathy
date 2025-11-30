import { fix } from './package.json.declapract';

describe('prettier bad practice package.json', () => {
  it('should remove prettier devDependencies and scripts', async () => {
    const contents = JSON.stringify(
      {
        devDependencies: {
          prettier: '2.8.1',
          '@trivago/prettier-plugin-sort-imports': '4.3.0',
          jest: '29.3.1',
          typescript: '5.4.5',
        },
        scripts: {
          'fix:format:prettier':
            "prettier --write '**/*.ts' --config ./prettier.config.js",
          'test:format:prettier':
            "prettier --parser typescript --check 'src/**/*.ts' --config ./prettier.config.js",
          'test:unit': 'jest',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);
    const parsed = JSON.parse(fixed!);

    // Should keep non-prettier deps
    expect(parsed.devDependencies.jest).toBe('29.3.1');
    expect(parsed.devDependencies.typescript).toBe('5.4.5');

    // Should remove prettier deps
    expect(parsed.devDependencies.prettier).toBeUndefined();
    expect(
      parsed.devDependencies['@trivago/prettier-plugin-sort-imports'],
    ).toBeUndefined();

    // Should keep non-prettier scripts
    expect(parsed.scripts['test:unit']).toBe('jest');

    // Should remove prettier scripts
    expect(parsed.scripts['fix:format:prettier']).toBeUndefined();
    expect(parsed.scripts['test:format:prettier']).toBeUndefined();
  });

  it('should not modify file if no prettier deps or scripts present', async () => {
    const contents = JSON.stringify(
      {
        devDependencies: {
          jest: '29.3.1',
        },
        scripts: {
          'test:unit': 'jest',
        },
      },
      null,
      2,
    );

    const { contents: fixed } = await fix(contents, {} as any);

    expect(fixed).toBe(contents);
  });
});
