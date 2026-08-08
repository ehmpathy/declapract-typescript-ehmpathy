/**
 * usecase.3: removal intent
 *
 * when a dependency is removed in one branch,
 * the removal should win over updates in the other branch
 */

import { given, then, when } from 'test-fns';

import { mergePackageJson } from '../domain.operations/mergePackageJson';

describe('usecase.3: removal intent', () => {
  given('dep removed in one branch', () => {
    when('removed in ours', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20', express: '4.17.0' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { express: '4.17.0' }, // lodash removed
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20', express: '4.17.0' },
        }),
      });

      then('dep is removed in result', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toBeUndefined();
        expect(parsed.dependencies.express).toEqual('4.17.0');
      });
    });

    when('removed in theirs', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20', express: '4.17.0' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20', express: '4.17.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { express: '4.17.0' }, // lodash removed
        }),
      });

      then('dep is removed in result', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toBeUndefined();
        expect(parsed.dependencies.express).toEqual('4.17.0');
      });
    });
  });

  given('dep removed in one branch, updated in other', () => {
    when('removed in ours, updated in theirs', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {}, // lodash removed
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.22' }, // lodash updated
        }),
      });

      then('removal wins', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies).toBeUndefined(); // empty section removed
      });
    });

    when('updated in ours, removed in theirs', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.22' }, // lodash updated
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {}, // lodash removed
        }),
      });

      then('removal wins', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies).toBeUndefined(); // empty section removed
      });
    });
  });

  given('dep removed in both branches', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20', express: '4.17.0' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { express: '4.17.0' }, // lodash removed
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { express: '4.17.0' }, // lodash removed
        }),
      });

      then('dep is removed in result', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toBeUndefined();
        expect(parsed.dependencies.express).toEqual('4.17.0');
      });
    });
  });

  given('removal alongside other changes', () => {
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
            // lodash removed
            express: '4.18.0', // express updated
            axios: '0.21.0',
            newDep: '1.0.0', // newDep added
          },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {
            lodash: '4.17.22', // lodash updated
            express: '4.17.0',
            // axios removed
            anotherDep: '2.0.0', // anotherDep added
          },
        }),
      });

      then('removals honored, updates and additions merged', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toBeUndefined(); // removal wins
        expect(parsed.dependencies.express).toEqual('4.18.0'); // ours higher
        expect(parsed.dependencies.axios).toBeUndefined(); // removal wins
        expect(parsed.dependencies.newDep).toEqual('1.0.0'); // addition
        expect(parsed.dependencies.anotherDep).toEqual('2.0.0'); // addition
      });
    });
  });
});
