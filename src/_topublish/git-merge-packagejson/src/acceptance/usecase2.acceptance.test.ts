/**
 * usecase.2: union additions
 *
 * dependencies added in either branch should be preserved in the result
 */

import { given, then, when } from 'test-fns';

import { mergePackageJson } from '../domain.operations/mergePackageJson';

describe('usecase.2: union additions', () => {
  given('dep added in one branch, absent in base', () => {
    when('added in ours only', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {},
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { newDep: '1.0.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {},
        }),
      });

      then('dep is preserved', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.newDep).toEqual('1.0.0');
      });
    });

    when('added in theirs only', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {},
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {},
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { newDep: '2.0.0' },
        }),
      });

      then('dep is preserved', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.newDep).toEqual('2.0.0');
      });
    });
  });

  given('different deps added in each branch', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { base: '1.0.0' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { base: '1.0.0', oursDep: '1.0.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { base: '1.0.0', theirsDep: '2.0.0' },
        }),
      });

      then('both deps appear in result', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.base).toEqual('1.0.0');
        expect(parsed.dependencies.oursDep).toEqual('1.0.0');
        expect(parsed.dependencies.theirsDep).toEqual('2.0.0');
      });
    });
  });

  given('same dep added in both branches with same version', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {},
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { newDep: '1.0.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { newDep: '1.0.0' },
        }),
      });

      then('dep appears once', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.newDep).toEqual('1.0.0');
      });
    });
  });

  given('same dep added in both branches with different versions', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {},
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { newDep: '1.0.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { newDep: '2.0.0' },
        }),
      });

      then('higher version wins', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.newDep).toEqual('2.0.0');
      });
    });
  });

  given('deps added across multiple sections', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { prodDep: '1.0.0' },
          devDependencies: { devDep: '1.0.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          peerDependencies: { peerDep: '1.0.0' },
          optionalDependencies: { optDep: '1.0.0' },
        }),
      });

      then('all additions preserved', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.prodDep).toEqual('1.0.0');
        expect(parsed.devDependencies.devDep).toEqual('1.0.0');
        expect(parsed.peerDependencies.peerDep).toEqual('1.0.0');
        expect(parsed.optionalDependencies.optDep).toEqual('1.0.0');
      });
    });
  });
});
