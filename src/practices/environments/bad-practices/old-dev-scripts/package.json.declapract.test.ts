import { check, fix } from './package.json.declapract';

describe('old-dev-scripts package.json', () => {
  describe('check', () => {
    it('should match package.json with scripts that end in :dev', () => {
      const contents = JSON.stringify(
        {
          scripts: {
            'start:hot:dev': 'npm run start:hot -- --stage dev',
            'test:unit': 'jest',
          },
        },
        null,
        2,
      );
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match package.json with scripts that have :dev: in the middle', () => {
      const contents = JSON.stringify(
        {
          scripts: {
            'build:dev:ios': 'npm run build:ios',
            'test:unit': 'jest',
          },
        },
        null,
        2,
      );
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not match package.json without :dev scripts', () => {
      const contents = JSON.stringify(
        {
          scripts: {
            'start:hot:prep': 'npm run start:hot -- --stage prep',
            'test:unit': 'jest',
          },
        },
        null,
        2,
      );
      expect(() => check(contents, {} as any)).toThrow('no scripts with :dev segment');
    });

    it('should not match when no scripts exist', () => {
      const contents = JSON.stringify({ name: 'test-package' }, null, 2);
      expect(() => check(contents, {} as any)).toThrow('no scripts with :dev segment');
    });

    it('should not match empty contents', () => {
      expect(() => check(undefined, {} as any)).toThrow('does not match bad practice');
    });
  });

  describe('fix', () => {
    it('should rename scripts from :dev to :prep', async () => {
      const contents = JSON.stringify(
        {
          name: 'test-package',
          scripts: {
            'start:hot:dev': 'npm run start:hot -- --stage dev',
            'deploy:dev': 'sls deploy --stage dev',
            'test:unit': 'jest',
          },
        },
        null,
        2,
      );

      const result = await fix(contents, {} as any);
      const parsed = JSON.parse(result.contents!);

      // snapshot for visual diff review
      expect(result.contents).toMatchSnapshot();

      expect(parsed.scripts['start:hot:dev']).toBeUndefined();
      expect(parsed.scripts['deploy:dev']).toBeUndefined();
      expect(parsed.scripts['start:hot:prep']).toBe('npm run start:hot -- --stage dev');
      expect(parsed.scripts['deploy:prep']).toBe('sls deploy --stage dev');
      expect(parsed.scripts['test:unit']).toBe('jest');
    });

    it('should handle multiple :dev scripts', async () => {
      const contents = JSON.stringify(
        {
          scripts: {
            'build:dev': 'npm run build',
            'build:dev:ios': 'npm run build:ios',
            'start:livedb:dev': 'npm run start:db',
          },
        },
        null,
        2,
      );

      const result = await fix(contents, {} as any);
      const parsed = JSON.parse(result.contents!);

      expect(parsed.scripts['build:prep']).toBe('npm run build');
      expect(parsed.scripts['build:dev:ios']).toBeUndefined();
      expect(parsed.scripts['build:prep:ios']).toBe('npm run build:ios');
      expect(parsed.scripts['start:livedb:prep']).toBe('npm run start:db');
    });

    it('should preserve non-:dev scripts', async () => {
      const contents = JSON.stringify(
        {
          scripts: {
            'start:hot:dev': 'npm run start',
            'test:unit': 'jest',
            'build': 'tsc',
          },
        },
        null,
        2,
      );

      const result = await fix(contents, {} as any);
      const parsed = JSON.parse(result.contents!);

      expect(parsed.scripts['test:unit']).toBe('jest');
      expect(parsed.scripts['build']).toBe('tsc');
    });

    it('should return empty for undefined contents', async () => {
      const result = await fix(undefined, {} as any);
      expect(result).toEqual({});
    });
  });
});
