/**
 * usecase.1: version conflicts
 *
 * when the same dependency is updated in both branches,
 * the higher semver version should win
 */

import { given, then, when } from 'test-fns';

import { mergePackageJson } from '../domain.operations/mergePackageJson';

describe('usecase.1: version conflicts', () => {
  given('same dep updated in both branches', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.21' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.22' },
        }),
      });

      then('higher version wins', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.22');
      });

      then('no conflicts left', () => {
        expect(result.hasConflictsLeft).toBe(false);
      });
    });
  });

  given('multiple deps with conflicts', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {
            lodash: '4.17.20',
            express: '4.17.0',
            axios: '0.21.0',
          },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {
            lodash: '4.17.21',
            express: '4.18.0',
            axios: '0.21.1',
          },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {
            lodash: '4.17.22',
            express: '4.17.3',
            axios: '0.21.2',
          },
        }),
      });

      then('each dep resolved independently', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.22'); // theirs higher
        expect(parsed.dependencies.express).toEqual('4.18.0'); // ours higher
        expect(parsed.dependencies.axios).toEqual('0.21.2'); // theirs higher
      });
    });
  });

  given('pre-release vs stable version', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { pkg: '1.0.0-beta.1' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { pkg: '1.0.0-beta.2' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { pkg: '1.0.0' },
        }),
      });

      then('stable wins over pre-release', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.pkg).toEqual('1.0.0');
      });
    });
  });

  given('caret vs tilde qualifiers', () => {
    when('higher base version is caret', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '^4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '^4.18.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '~4.17.22' },
        }),
      });

      then('higher version wins with its qualifier', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('^4.18.0');
      });
    });

    when('higher base version is tilde', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '~4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '^4.17.21' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '~4.18.0' },
        }),
      });

      then('higher version wins with its qualifier', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('~4.18.0');
      });
    });
  });

  given('equal versions in both branches', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.21' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.21' },
        }),
      });

      then('same version is kept', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.21');
      });
    });
  });
});
