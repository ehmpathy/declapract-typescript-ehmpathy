import { check, fix } from './package.json.declapract';

describe('logs leveled-term bad practice package.json', () => {
  describe('check', () => {
    it('should detect simple-leveled-log-methods in devDependencies', () => {
      const contents = JSON.stringify({
        devDependencies: { 'simple-leveled-log-methods': '1.0.0' },
      });
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should detect simple-leveled-log-methods in dependencies', () => {
      // teeth: the old devDependencies-pinned CONTAINS template was blind to a runtime
      // (dependencies) placement, so the bad practice silently never fired for it.
      const contents = JSON.stringify({
        dependencies: { 'simple-leveled-log-methods': '1.0.0' },
      });
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should skip when the deprecated dep is absent', () => {
      const contents = JSON.stringify({ dependencies: { lodash: '4.0.0' } });
      // snapshot the FULL throw message so the dep-labeled detail cannot silently
      // drift back to a bare 'does not match bad practice' string (r009.n3)
      let message = '';
      try {
        check(contents, {} as any);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toMatchSnapshot('check skip message — dep absent');
    });

    it('states the practice + remediation when the manifest is malformed json', () => {
      // teeth: asPackageJSON turns the raw engine SyntaxError into an actionable,
      // context-rich message; snapshot the exact consumer-visible output a repo with a
      // stray comma actually sees, so it cannot regress to a bare parse error (r009.b1)
      const contents = '{ "dependencies": { "lodash": "4.0.0", } }'; // stray comma
      let message = '';
      try {
        check(contents, {} as any);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toContain(
        '[logs/leveled-term] could not parse package.json',
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
    it('should remove the dep from dependencies (runtime placement)', async () => {
      // teeth: the old fix removed the dep only from devDependencies
      const contents = JSON.stringify(
        {
          dependencies: {
            'simple-leveled-log-methods': '1.0.0',
            lodash: '4.0.0',
          },
        },
        null,
        2,
      );
      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);
      expect(parsed.dependencies['simple-leveled-log-methods']).toBeUndefined();
      expect(parsed.dependencies.lodash).toBe('4.0.0');
      // snapshot the emitted manifest so a reviewer can eyeball the exact end state
      expect(fixed).toMatchSnapshot('fixed package.json — runtime placement');
    });

    it('should remove the dep from devDependencies', async () => {
      const contents = JSON.stringify(
        {
          devDependencies: {
            'simple-leveled-log-methods': '1.0.0',
            jest: '29.0.0',
          },
        },
        null,
        2,
      );
      const { contents: fixed } = await fix(contents, {} as any);
      const parsed = JSON.parse(fixed!);
      expect(
        parsed.devDependencies['simple-leveled-log-methods'],
      ).toBeUndefined();
      expect(parsed.devDependencies.jest).toBe('29.0.0');
      // snapshot the emitted manifest so a reviewer can eyeball the exact end state
      expect(fixed).toMatchSnapshot('fixed package.json — devDependencies');
    });

    it('should be idempotent (a second fix pass is a no-op)', async () => {
      const contents = JSON.stringify(
        {
          dependencies: {
            'simple-leveled-log-methods': '1.0.0',
            lodash: '4.0.0',
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
