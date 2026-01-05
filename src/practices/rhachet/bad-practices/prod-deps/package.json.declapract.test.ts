import { check, fix } from './package.json.declapract';

describe('rhachet prod-deps bad practice package.json', () => {
  describe('check', () => {
    it('should match when rhachet is in prod dependencies', () => {
      const contents = JSON.stringify({
        dependencies: {
          rhachet: '1.0.0',
        },
      });

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match when rhachet-roles-ehmpathy is in prod dependencies', () => {
      const contents = JSON.stringify({
        dependencies: {
          'rhachet-roles-ehmpathy': '1.0.0',
        },
      });

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match when multiple rhachet packages are in prod dependencies', () => {
      const contents = JSON.stringify({
        dependencies: {
          rhachet: '1.0.0',
          'rhachet-roles-ehmpathy': '1.0.0',
          'rhachet-roles-bhrain': '0.5.0',
        },
      });

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not match when rhachet packages are only in devDependencies', () => {
      const contents = JSON.stringify({
        devDependencies: {
          rhachet: '1.0.0',
          'rhachet-roles-ehmpathy': '1.0.0',
        },
      });

      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    it('should not match when no rhachet packages are present', () => {
      const contents = JSON.stringify({
        dependencies: {
          lodash: '4.0.0',
        },
        devDependencies: {
          jest: '29.0.0',
        },
      });

      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    it('should not match empty package.json', () => {
      const contents = JSON.stringify({});

      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });
  });

  describe('fix', () => {
    it('should move rhachet from dependencies to devDependencies', async () => {
      const contents = JSON.stringify(
        {
          dependencies: {
            rhachet: '1.19.0',
            lodash: '4.17.21',
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

      // rhachet should be moved to devDependencies
      expect(parsed.dependencies.rhachet).toBeUndefined();
      expect(parsed.devDependencies.rhachet).toBe('1.19.0');

      // other deps should remain unchanged
      expect(parsed.dependencies.lodash).toBe('4.17.21');
      expect(parsed.devDependencies.jest).toBe('29.3.1');
    });

    it('should move all rhachet-* packages from dependencies to devDependencies', async () => {
      const contents = JSON.stringify(
        {
          dependencies: {
            rhachet: '1.19.0',
            'rhachet-roles-ehmpathy': '1.15.0',
            'rhachet-roles-bhrain': '0.5.0',
            lodash: '4.17.21',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      // all rhachet packages should be moved to devDependencies
      expect(parsed.dependencies.rhachet).toBeUndefined();
      expect(parsed.dependencies['rhachet-roles-ehmpathy']).toBeUndefined();
      expect(parsed.dependencies['rhachet-roles-bhrain']).toBeUndefined();

      expect(parsed.devDependencies.rhachet).toBe('1.19.0');
      expect(parsed.devDependencies['rhachet-roles-ehmpathy']).toBe('1.15.0');
      expect(parsed.devDependencies['rhachet-roles-bhrain']).toBe('0.5.0');

      // other deps should remain unchanged
      expect(parsed.dependencies.lodash).toBe('4.17.21');
    });

    it('should remove dependencies key if empty after moving rhachet packages', async () => {
      const contents = JSON.stringify(
        {
          dependencies: {
            rhachet: '1.19.0',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      expect(parsed.dependencies).toBeUndefined();
      expect(parsed.devDependencies.rhachet).toBe('1.19.0');
    });

    it('should preserve existing devDependencies when moving rhachet packages', async () => {
      const contents = JSON.stringify(
        {
          dependencies: {
            rhachet: '1.19.0',
          },
          devDependencies: {
            jest: '29.3.1',
            typescript: '5.4.5',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      expect(parsed.devDependencies.rhachet).toBe('1.19.0');
      expect(parsed.devDependencies.jest).toBe('29.3.1');
      expect(parsed.devDependencies.typescript).toBe('5.4.5');
    });

    it('should not modify package.json without rhachet in prod deps', async () => {
      const contents = JSON.stringify(
        {
          dependencies: {
            lodash: '4.17.21',
          },
          devDependencies: {
            rhachet: '1.19.0',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);

      // should be unchanged (modulo formatting)
      const parsed = JSON.parse(fixed!);
      expect(parsed.dependencies.lodash).toBe('4.17.21');
      expect(parsed.devDependencies.rhachet).toBe('1.19.0');
    });
  });
});
