import { given, then, when } from 'test-fns';

import { compareVersions } from './compareVersions';

describe('compareVersions', () => {
  given('two semver versions where b is higher', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: '1.2.3',
        versionB: '1.2.4',
      });

      then('returns b-higher', () => {
        expect(result).toEqual('b-higher');
      });
    });
  });

  given('two semver versions where a is higher', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: '2.0.0',
        versionB: '1.9.9',
      });

      then('returns a-higher', () => {
        expect(result).toEqual('a-higher');
      });
    });
  });

  given('two equal semver versions', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: '1.0.0',
        versionB: '1.0.0',
      });

      then('returns equal', () => {
        expect(result).toEqual('equal');
      });
    });
  });

  given('stable vs pre-release version', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: '1.0.0',
        versionB: '1.0.0-beta.1',
      });

      then('stable is higher (a-higher)', () => {
        expect(result).toEqual('a-higher');
      });
    });
  });

  given('two pre-release versions', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: '1.0.0-alpha',
        versionB: '1.0.0-beta',
      });

      then('beta is higher (b-higher)', () => {
        expect(result).toEqual('b-higher');
      });
    });
  });

  given('versions with caret qualifiers', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: '^1.2.3',
        versionB: '^1.3.0',
      });

      then('compares without qualifiers (b-higher)', () => {
        expect(result).toEqual('b-higher');
      });
    });
  });

  given('versions with tilde qualifiers', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: '~2.0.0',
        versionB: '~1.9.9',
      });

      then('compares without qualifiers (a-higher)', () => {
        expect(result).toEqual('a-higher');
      });
    });
  });

  given('non-semver "latest" vs semver version', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: 'latest',
        versionB: '1.0.0',
      });

      then('returns incomparable', () => {
        expect(result).toEqual('incomparable');
      });
    });
  });

  given('two file: protocol versions', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: 'file:../a',
        versionB: 'file:../b',
      });

      then('returns incomparable', () => {
        expect(result).toEqual('incomparable');
      });
    });
  });

  given('workspace: protocol versions', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: 'workspace:^',
        versionB: '1.0.0',
      });

      then('returns incomparable', () => {
        expect(result).toEqual('incomparable');
      });
    });
  });

  given('versions with build metadata', () => {
    when('compared', () => {
      const result = compareVersions({
        versionA: '1.0.0+build.123',
        versionB: '1.0.0+build.456',
      });

      then('build metadata is ignored (equal)', () => {
        expect(result).toEqual('equal');
      });
    });
  });
});
