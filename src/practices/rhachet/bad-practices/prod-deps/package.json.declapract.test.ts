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

    it('should not match single-segment rhachet-* packages (no family) in prod dependencies', () => {
      const contents = JSON.stringify({
        dependencies: {
          'rhachet-other': '1.0.0',
          'rhachet-toolbox': '2.0.0',
        },
      });

      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    it('should match when a rhachet-brains-* package is in prod dependencies', () => {
      // teeth: under the old /^rhachet(-roles-.*)?$/ this brains-family dep was invisible,
      // so a prod-dep + devDep version conflict on it went undetected.
      const contents = JSON.stringify({
        dependencies: {
          'rhachet-brains-bhrain': '1.0.0',
        },
      });

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('snaps the FULL skip message so the family detail cannot silently drift', () => {
      // r009.n3: the enriched '...no rhachet(-<family>-*) package in dependencies' string is
      // the consumer-visible signal; a partial-prefix assert would survive its regression.
      const contents = JSON.stringify({ dependencies: { lodash: '4.0.0' } });
      let message = '';
      try {
        check(contents, {} as any);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toMatchSnapshot('check skip message — no rhachet dep');
    });

    it('states the practice + remediation when the manifest is malformed json', () => {
      // r009.b1: asPackageJSON turns the raw engine SyntaxError into an actionable,
      // context-rich message; snapshot the exact consumer-visible output.
      const contents = '{ "dependencies": { "rhachet": "1.0.0", } }'; // stray comma
      let message = '';
      try {
        check(contents, {} as any);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toContain(
        '[rhachet/prod-deps] could not parse package.json',
      );
      expect(message).toContain('fix: ensure the package.json holds valid json');
      // snapshot the DURABLE wrapper (practice prefix + fix hint), with the volatile V8 engine
      // reason normalized out — that reason is produced by the js engine, not this repo, so a
      // node/v8 bump would re-word it and break this snapshot for a change unrelated to the
      // practice (r009.n3). the .toContain assertions above pin the parts we actually own.
      const normalized = message
        .replace(
          /could not parse package\.json: [\s\S]*?\. fix:/,
          'could not parse package.json: <engine reason normalized>. fix:',
        )
        .replace(/"reason": "[^"]*"/, '"reason": "<engine reason normalized>"');
      expect(normalized).toMatchSnapshot(
        'check malformed-json message (engine reason normalized)',
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

      // snapshot the emitted manifest so a reviewer can eyeball the exact end state
      expect(fixed).toMatchSnapshot('fixed package.json — all rhachet families relocated');
    });

    it('should preserve the dependencies key presence (empty) after the move', async () => {
      // the consumer declared `dependencies`, so it stays (as `{}`) rather than the key
      // dropped — a true no-op shape, per the leveled-term twin's presence guarantee.
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

      expect(parsed.dependencies).toEqual({});
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

    it('should not move single-segment rhachet-* packages (no family)', async () => {
      const contents = JSON.stringify(
        {
          dependencies: {
            'rhachet-other': '1.0.0',
            'rhachet-toolbox': '2.0.0',
            lodash: '4.17.21',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      // single-segment packages should remain in dependencies
      expect(parsed.dependencies['rhachet-other']).toBe('1.0.0');
      expect(parsed.dependencies['rhachet-toolbox']).toBe('2.0.0');
      expect(parsed.dependencies.lodash).toBe('4.17.21');
      expect(parsed.devDependencies).toBeUndefined();
    });

    it('should move a rhachet-brains-* package from dependencies to devDependencies', async () => {
      // teeth: the brains family was invisible to the old pattern, so this stayed a prod dep
      const contents = JSON.stringify(
        {
          dependencies: {
            'rhachet-brains-bhrain': '1.0.0',
            lodash: '4.17.21',
          },
        },
        null,
        2,
      );

      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);

      expect(parsed.dependencies['rhachet-brains-bhrain']).toBeUndefined();
      expect(parsed.devDependencies['rhachet-brains-bhrain']).toBe('1.0.0');
      expect(parsed.dependencies.lodash).toBe('4.17.21');
    });

    it('should be idempotent (a second fix pass is a no-op)', async () => {
      const contents = JSON.stringify(
        {
          dependencies: {
            rhachet: '1.19.0',
            'rhachet-roles-ehmpathy': '1.15.0',
            'rhachet-brains-bhrain': '1.0.0',
            lodash: '4.17.21',
          },
        },
        null,
        2,
      );

      const { contents: once } = await fix(contents, {} as any);
      const { contents: twice } = await fix(once!, {} as any);

      expect(twice).toEqual(once);
    });
  });
});
