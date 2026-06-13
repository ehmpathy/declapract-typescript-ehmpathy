/**
 * usecase.5: scope limitation
 *
 * non-dependency fields should be left with conflict markers
 * when they have conflicts. the tool only resolves dependency sections.
 */

import { given, then, when } from 'test-fns';

import { mergePackageJson } from '../domain.operations/mergePackageJson';

describe('usecase.5: scope limitation', () => {
  given('non-dep field conflict (scripts)', () => {
    when('ours contains conflict markers', () => {
      const conflictedOurs = `{
  "name": "test-pkg",
<<<<<<< HEAD
  "scripts": {
    "test": "jest --verbose"
  },
=======
  "scripts": {
    "test": "jest"
  },
>>>>>>> feature
  "dependencies": {
    "lodash": "4.17.21"
  }
}`;

      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          scripts: { test: 'jest' },
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: conflictedOurs,
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          scripts: { test: 'jest' },
          dependencies: { lodash: '4.17.22' },
        }),
      });

      then('hasConflictsLeft is true', () => {
        expect(result.hasConflictsLeft).toBe(true);
      });

      then('dependencies are still merged', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.22');
      });
    });
  });

  given('non-dep field conflict (version)', () => {
    when('ours contains conflict markers', () => {
      const conflictedOurs = `{
  "name": "test-pkg",
<<<<<<< HEAD
  "version": "1.0.1",
=======
  "version": "1.0.2",
>>>>>>> feature
  "dependencies": {
    "lodash": "4.17.21"
  }
}`;

      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: conflictedOurs,
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          version: '1.0.2',
          dependencies: { lodash: '4.17.22' },
        }),
      });

      then('hasConflictsLeft is true', () => {
        expect(result.hasConflictsLeft).toBe(true);
      });
    });
  });

  given('dep sections resolved, scripts conflicted', () => {
    when('merged', () => {
      const conflictedOurs = `{
  "name": "test-pkg",
<<<<<<< HEAD
  "scripts": {
    "build": "tsc --build"
  },
=======
  "scripts": {
    "build": "tsc"
  },
>>>>>>> feature
  "dependencies": {
    "lodash": "4.17.21"
  },
  "devDependencies": {
    "typescript": "5.0.0"
  }
}`;

      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          scripts: { build: 'tsc' },
          dependencies: { lodash: '4.17.20' },
          devDependencies: { typescript: '4.9.0' },
        }),
        oursContent: conflictedOurs,
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          scripts: { build: 'tsc' },
          dependencies: { lodash: '4.17.22' },
          devDependencies: { typescript: '5.2.0' },
        }),
      });

      then('deps are merged', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.22');
        expect(parsed.devDependencies.typescript).toEqual('5.2.0');
      });

      then('conflicts remain flagged', () => {
        expect(result.hasConflictsLeft).toBe(true);
      });
    });
  });

  given('only non-dep field conflicts (no dep changes)', () => {
    when('merged', () => {
      const conflictedOurs = `{
  "name": "test-pkg",
<<<<<<< HEAD
  "description": "A test package v1",
=======
  "description": "A test package v2",
>>>>>>> feature
  "dependencies": {
    "lodash": "4.17.21"
  }
}`;

      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          description: 'A test package',
          dependencies: { lodash: '4.17.21' },
        }),
        oursContent: conflictedOurs,
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          description: 'A test package v2',
          dependencies: { lodash: '4.17.21' },
        }),
      });

      then('conflicts remain flagged', () => {
        expect(result.hasConflictsLeft).toBe(true);
      });

      then('deps remain unchanged', () => {
        const parsed = JSON.parse(result.merged);
        expect(parsed.dependencies.lodash).toEqual('4.17.21');
      });
    });
  });

  given('no conflicts at all', () => {
    when('clean merge', () => {
      const result = mergePackageJson({
        baseContent: JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          dependencies: { lodash: '4.17.20' },
        }),
        oursContent: JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          dependencies: { lodash: '4.17.21' },
        }),
        theirsContent: JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          dependencies: { lodash: '4.17.22' },
        }),
      });

      then('hasConflictsLeft is false', () => {
        expect(result.hasConflictsLeft).toBe(false);
      });
    });
  });
});
