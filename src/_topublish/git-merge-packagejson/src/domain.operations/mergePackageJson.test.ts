import { given, then, when } from 'test-fns';

import { mergePackageJson } from './mergePackageJson';

describe('mergePackageJson', () => {
  given('dependencies section only', () => {
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

      then('dependencies are merged', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.22');
      });

      then('no conflicts left', () => {
        expect(result.hasConflictsLeft).toBe(false);
      });
    });
  });

  given('devDependencies section only', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          devDependencies: { jest: '29.0.0' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          devDependencies: { jest: '29.5.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          devDependencies: { jest: '29.7.0' },
        }),
      });

      then('devDependencies are merged', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.devDependencies.jest).toEqual('29.7.0');
      });
    });
  });

  given('all four sections with conflicts', () => {
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

      then('each section is merged independently', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.22');
        expect(parsed.devDependencies.jest).toEqual('29.7.0');
        expect(parsed.peerDependencies.react).toEqual('18.0.0');
        expect(parsed.optionalDependencies.fsevents).toEqual('2.3.2');
      });
    });
  });

  given('non-dep field in ours has conflict markers', () => {
    when('merged', () => {
      const conflictedOurs = `{
  "name": "test-pkg",
  "version": "1.0.0",
<<<<<<< HEAD
  "scripts": {
    "test": "jest --verbose"
  },
=======
  "scripts": {
    "test": "jest"
  },
>>>>>>> feature-branch
  "dependencies": {
    "lodash": "4.17.21"
  }
}`;

      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          scripts: { test: 'jest' },
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: conflictedOurs,
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          scripts: { test: 'jest' },
          dependencies: { lodash: '4.17.22' },
        }),
      });

      then('hasConflictsLeft is true', () => {
        expect(result.hasConflictsLeft).toBe(true);
      });
    });
  });

  given('additions in both branches', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.21', axios: '1.0.0' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.22', express: '4.18.0' },
        }),
      });

      then('all deps are included', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.22');
        expect(parsed.dependencies.axios).toEqual('1.0.0');
        expect(parsed.dependencies.express).toEqual('4.18.0');
      });
    });
  });

  given('removal in one branch', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20', axios: '0.21.0' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.21' }, // axios removed
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.22', axios: '0.21.1' },
        }),
      });

      then('removal wins', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.22');
        expect(parsed.dependencies.axios).toBeUndefined();
      });
    });
  });

  given('result output format', () => {
    when('merged', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({ name: 'pkg', dependencies: {} }),
        oursContent: JSON.stringify({ name: 'pkg', dependencies: { a: '1.0.0' } }),
        theirsContent: JSON.stringify({ name: 'pkg', dependencies: { b: '2.0.0' } }),
      });

      then('result is valid json', () => {
        expect(() => JSON.parse(result.merged)).not.toThrow();
      });

      then('result ends with newline', () => {
        expect(result.merged.endsWith('\n')).toBe(true);
      });
    });
  });

  given('empty dependency section after merge', () => {
    when('all deps removed', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {},
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          dependencies: {},
        }),
      });

      then('section is excluded from result', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies).toBeUndefined();
      });
    });
  });
});
