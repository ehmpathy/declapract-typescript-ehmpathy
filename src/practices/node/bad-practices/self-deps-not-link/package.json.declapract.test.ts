import { check, fix } from './package.json.declapract';

describe('self-deps-not-link package.json', () => {
  describe('check', () => {
    it('should detect self-dep in dependencies with version specifier', () => {
      const contents = JSON.stringify({
        name: 'my-package',
        dependencies: {
          'my-package': '^1.0.0',
        },
      });

      // should not throw = bad practice detected
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should detect self-dep in devDependencies with version specifier', () => {
      const contents = JSON.stringify({
        name: 'my-package',
        devDependencies: {
          'my-package': '1.0.0',
        },
      });

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should NOT detect self-dep with link:.', () => {
      const contents = JSON.stringify({
        name: 'my-package',
        devDependencies: {
          'my-package': 'link:.',
        },
      });

      // should throw = not a bad practice
      expect(() => check(contents, {} as any)).toThrow(
        'no bad self-dependencies found',
      );
    });

    it('should NOT detect when no self-dep exists', () => {
      const contents = JSON.stringify({
        name: 'my-package',
        dependencies: {
          'other-package': '^1.0.0',
        },
      });

      expect(() => check(contents, {} as any)).toThrow(
        'no bad self-dependencies found',
      );
    });

    it('should NOT detect when no deps exist', () => {
      const contents = JSON.stringify({
        name: 'my-package',
      });

      expect(() => check(contents, {} as any)).toThrow(
        'no bad self-dependencies found',
      );
    });
  });

  describe('fix', () => {
    it('should remove self-dep from dependencies', async () => {
      const contents = JSON.stringify(
        {
          name: 'my-package',
          dependencies: {
            'my-package': '^1.0.0',
            'other-package': '^2.0.0',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      expect(parsed.dependencies['my-package']).toBeUndefined();
      expect(parsed.dependencies['other-package']).toBe('^2.0.0');
    });

    it('should remove self-dep from devDependencies', async () => {
      const contents = JSON.stringify(
        {
          name: 'my-package',
          devDependencies: {
            'my-package': '1.0.0',
            jest: '29.0.0',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      expect(parsed.devDependencies['my-package']).toBeUndefined();
      expect(parsed.devDependencies.jest).toBe('29.0.0');
    });

    it('should remove empty deps object after fix', async () => {
      const contents = JSON.stringify(
        {
          name: 'my-package',
          dependencies: {
            'my-package': '^1.0.0',
          },
          devDependencies: {
            jest: '29.0.0',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      expect(parsed.dependencies).toBeUndefined();
      expect(parsed.devDependencies.jest).toBe('29.0.0');
    });

    it('should NOT modify link:. self-deps', async () => {
      const contents = JSON.stringify(
        {
          name: 'my-package',
          devDependencies: {
            'my-package': 'link:.',
            jest: '29.0.0',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(contents);
    });

    it('should handle multiple bad self-deps across dep types', async () => {
      const contents = JSON.stringify(
        {
          name: 'my-package',
          dependencies: {
            'my-package': '^1.0.0',
          },
          devDependencies: {
            'my-package': '1.0.0',
          },
          peerDependencies: {
            'my-package': '>=1.0.0',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      expect(parsed.dependencies).toBeUndefined();
      expect(parsed.devDependencies).toBeUndefined();
      expect(parsed.peerDependencies).toBeUndefined();
    });

    it('should return unchanged if no bad self-deps', async () => {
      const contents = JSON.stringify(
        {
          name: 'my-package',
          dependencies: {
            'other-package': '^1.0.0',
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
