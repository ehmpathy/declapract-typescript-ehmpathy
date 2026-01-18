/**
 * usecase.4: dependency sections
 *
 * all four dependency sections should work independently:
 * - dependencies
 * - devDependencies
 * - peerDependencies
 * - optionalDependencies
 */

import { given, then, when } from 'test-fns';

import { mergePackageJson } from '../domain.operations/mergePackageJson';

describe('usecase.4: dependency sections', () => {
  given('conflicts in all four sections', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20' },
          devDependencies: { jest: '29.0.0' },
          peerDependencies: { react: '17.0.0' },
          optionalDependencies: { fsevents: '2.3.0' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.21' },
          devDependencies: { jest: '29.5.0' },
          peerDependencies: { react: '18.0.0' },
          optionalDependencies: { fsevents: '2.3.1' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.22' },
          devDependencies: { jest: '29.7.0' },
          peerDependencies: { react: '17.0.2' },
          optionalDependencies: { fsevents: '2.3.2' },
        }),
      });

      then('each section merged independently', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.22'); // theirs higher
        expect(parsed.devDependencies.jest).toEqual('29.7.0'); // theirs higher
        expect(parsed.peerDependencies.react).toEqual('18.0.0'); // ours higher
        expect(parsed.optionalDependencies.fsevents).toEqual('2.3.2'); // theirs higher
      });
    });
  });

  given('section exists in one branch only', () => {
    when('peerDependencies only in ours', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.21' },
          peerDependencies: { react: '18.0.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.22' },
        }),
      });

      then('section is preserved', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.peerDependencies.react).toEqual('18.0.0');
      });
    });

    when('optionalDependencies only in theirs', () => {
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
          optionalDependencies: { fsevents: '2.3.0' },
        }),
      });

      then('section is preserved', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.optionalDependencies.fsevents).toEqual('2.3.0');
      });
    });
  });

  given('section removed in one branch', () => {
    when('devDependencies section removed', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20' },
          devDependencies: { jest: '29.0.0' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.21' },
          // devDependencies removed entirely
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.22' },
          devDependencies: { jest: '29.7.0' },
        }),
      });

      then('deps in that section treated as removed', () => {
        const parsed = JSON.parse(result.merged);
        // jest was in base, removed in ours → removal wins
        expect(parsed.devDependencies).toBeUndefined();
      });
    });
  });

  given('same dep in different sections', () => {
    when('moved from devDependencies to dependencies', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          devDependencies: { typescript: '5.0.0' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { typescript: '5.2.0' },
          // removed from devDependencies
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          devDependencies: { typescript: '5.1.0' },
        }),
      });

      then('dep is in dependencies only', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.typescript).toEqual('5.2.0');
        expect(parsed.devDependencies).toBeUndefined();
      });
    });
  });
});
