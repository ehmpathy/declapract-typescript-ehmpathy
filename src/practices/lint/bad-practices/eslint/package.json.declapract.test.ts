import { check, fix } from './package.json.declapract';

describe('eslint bad practice package.json', () => {
  describe('check', () => {
    it('should not throw if blocklisted devDependencies are present (bad practice detected)', () => {
      const contents = JSON.stringify({
        devDependencies: {
          eslint: '8.56.0',
          jest: '29.3.1',
        },
      });

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should throw if no blocklisted devDependencies are present (not bad practice)', () => {
      const contents = JSON.stringify({
        devDependencies: {
          jest: '29.3.1',
          typescript: '5.4.5',
        },
      });

      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    it('should not throw if blocklisted scripts are present (bad practice detected)', () => {
      const contents = JSON.stringify({
        devDependencies: {
          jest: '29.3.1',
        },
        scripts: {
          'test:lint:eslint': 'eslint src/**/*.ts',
        },
      });

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should throw if no file found', () => {
      expect(() => check(null, {} as any)).toThrow(
        'does not match bad practice',
      );
    });
  });

  describe('fix', () => {
    it('should remove all blocklisted devDependencies', async () => {
      const contents = JSON.stringify(
        {
          devDependencies: {
            '@trivago/prettier-plugin-sort-imports': '4.3.0',
            prettier: '2.8.1',
            '@typescript-eslint/eslint-plugin': '7.8.0',
            '@typescript-eslint/parser': '7.8.0',
            eslint: '8.56.0',
            'eslint-config-airbnb-typescript': '18.0.0',
            'eslint-config-prettier': '8.5.0',
            'eslint-plugin-import': '2.26.0',
            'eslint-plugin-prettier': '4.2.1',
            'eslint-plugin-unused-imports': '4.1.4',
            jest: '29.3.1',
            typescript: '5.4.5',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      // Should keep non-blocklisted deps
      expect(parsed.devDependencies.jest).toBe('29.3.1');
      expect(parsed.devDependencies.typescript).toBe('5.4.5');

      // Should remove blocklisted deps (prettier deps are not in eslint blocklist)
      expect(
        parsed.devDependencies['@trivago/prettier-plugin-sort-imports'],
      ).toBe('4.3.0');
      expect(parsed.devDependencies.prettier).toBe('2.8.1');
      expect(
        parsed.devDependencies['@typescript-eslint/eslint-plugin'],
      ).toBeUndefined();
      expect(
        parsed.devDependencies['@typescript-eslint/parser'],
      ).toBeUndefined();
      expect(parsed.devDependencies.eslint).toBeUndefined();
      expect(
        parsed.devDependencies['eslint-config-airbnb-typescript'],
      ).toBeUndefined();
      expect(parsed.devDependencies['eslint-config-prettier']).toBeUndefined();
      expect(parsed.devDependencies['eslint-plugin-import']).toBeUndefined();
      expect(parsed.devDependencies['eslint-plugin-prettier']).toBeUndefined();
      expect(
        parsed.devDependencies['eslint-plugin-unused-imports'],
      ).toBeUndefined();
    });

    it('should remove blocklisted scripts', async () => {
      const contents = JSON.stringify(
        {
          devDependencies: {
            jest: '29.3.1',
          },
          scripts: {
            'test:lint:eslint': 'eslint src/**/*.ts',
            'test:unit': 'jest',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      expect(parsed.scripts['test:unit']).toBe('jest');
      expect(parsed.scripts['test:lint:eslint']).toBeUndefined();
    });

    it('should not modify file if no blocklisted deps or scripts present', async () => {
      const contents = JSON.stringify(
        {
          devDependencies: {
            jest: '29.3.1',
            typescript: '5.4.5',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(contents);
    });
  });
});
