/**
 * usecase.6: edge cases
 *
 * special version specifiers and error cases should be handled properly:
 * - latest
 * - file: protocol
 * - workspace: protocol
 * - invalid json
 */

import { given, then, when } from 'test-fns';

import { mergePackageJson } from '../domain.operations/mergePackageJson';

describe('usecase.6: edge cases', () => {
  given('latest version specifier', () => {
    when('merged with semver version', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { pkg: 'latest' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { pkg: 'latest' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { pkg: '1.0.0' },
        }),
      });

      then('ours is preserved (incomparable)', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.pkg).toEqual('latest');
      });
    });

    when('both are latest', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { pkg: 'latest' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { pkg: 'latest' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { pkg: 'latest' },
        }),
      });

      then('latest is preserved', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.pkg).toEqual('latest');
      });
    });
  });

  given('file: protocol version', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { localPkg: 'file:../local-v1' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { localPkg: 'file:../local-v2' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { localPkg: 'file:../local-v3' },
        }),
      });

      then('ours is preserved (incomparable)', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.localPkg).toEqual('file:../local-v2');
      });
    });
  });

  given('workspace: protocol version', () => {
    when('merged with semver', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { shared: 'workspace:^' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { shared: 'workspace:^' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { shared: '1.0.0' },
        }),
      });

      then('ours is preserved (incomparable)', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.shared).toEqual('workspace:^');
      });
    });
  });

  given('git+ protocol version', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { gitPkg: 'git+https://github.com/user/repo.git#v1' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { gitPkg: 'git+https://github.com/user/repo.git#v2' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { gitPkg: 'git+https://github.com/user/repo.git#v3' },
        }),
      });

      then('ours is preserved (incomparable)', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.gitPkg).toEqual(
          'git+https://github.com/user/repo.git#v2',
        );
      });
    });
  });

  given('invalid json in branch', () => {
    when('ours has invalid json', () => {
      expect(() =>
        mergePackageJson({
          baseContent: JSON.stringify({ name: 'test-pkg' }),
          oursContent: '{ invalid json }',
          theirsContent: JSON.stringify({ name: 'test-pkg' }),
        }),
      ).toThrow("invalid json in 'ours' branch");
    });

    when('theirs has invalid json', () => {
      expect(() =>
        mergePackageJson({
          baseContent: JSON.stringify({ name: 'test-pkg' }),
          oursContent: JSON.stringify({ name: 'test-pkg' }),
          theirsContent: '{ not valid }',
        }),
      ).toThrow("invalid json in 'theirs' branch");
    });

    when('base has invalid json', () => {
      expect(() =>
        mergePackageJson({
          baseContent: 'not json',
          oursContent: JSON.stringify({ name: 'test-pkg' }),
          theirsContent: JSON.stringify({ name: 'test-pkg' }),
        }),
      ).toThrow("invalid json in 'base' branch");
    });
  });

  given('empty file content', () => {
    when('ours is empty', () => {
      expect(() =>
        mergePackageJson({
          baseContent: JSON.stringify({ name: 'test-pkg' }),
          oursContent: '',
          theirsContent: JSON.stringify({ name: 'test-pkg' }),
        }),
      ).toThrow("empty content in 'ours' branch");
    });
  });

  given('mixed special and semver versions', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {
            semverPkg: '1.0.0',
            latestPkg: 'latest',
            filePkg: 'file:../local',
          },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {
            semverPkg: '1.0.1',
            latestPkg: 'latest',
            filePkg: 'file:../local-v2',
          },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {
            semverPkg: '1.0.2',
            latestPkg: 'latest',
            filePkg: 'file:../local-v3',
          },
        }),
      });

      then('semver resolved, special preserved', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.semverPkg).toEqual('1.0.2');
        expect(parsed.dependencies.latestPkg).toEqual('latest');
        expect(parsed.dependencies.filePkg).toEqual('file:../local-v2');
      });
    });
  });
});
