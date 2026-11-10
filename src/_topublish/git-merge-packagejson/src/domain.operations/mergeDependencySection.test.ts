import { given, then, when } from 'test-fns';

import { mergeDependencySection } from './mergeDependencySection';

describe('mergeDependencySection', () => {
  given('same dep with different versions in ours and theirs', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: { lodash: '4.17.20' },
        ours: { lodash: '4.17.21' },
        theirs: { lodash: '4.17.22' },
      });

      then('higher version wins', () => {
        expect(result).toEqual({ lodash: '4.17.22' });
      });
    });
  });

  given('same dep with caret qualifiers', () => {
    when('ours has higher base version', () => {
      const result = mergeDependencySection({
        base: { lodash: '^4.17.20' },
        ours: { lodash: '^4.18.0' },
        theirs: { lodash: '^4.17.22' },
      });

      then('higher version wins with its qualifier', () => {
        expect(result).toEqual({ lodash: '^4.18.0' });
      });
    });
  });

  given('dep added in ours only', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: {},
        ours: { lodash: '4.17.21' },
        theirs: {},
      });

      then('dep is included', () => {
        expect(result).toEqual({ lodash: '4.17.21' });
      });
    });
  });

  given('dep added in theirs only', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: {},
        ours: {},
        theirs: { lodash: '4.17.21' },
      });

      then('dep is included', () => {
        expect(result).toEqual({ lodash: '4.17.21' });
      });
    });
  });

  given('dep added in both with same version', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: {},
        ours: { lodash: '4.17.21' },
        theirs: { lodash: '4.17.21' },
      });

      then('dep is included once', () => {
        expect(result).toEqual({ lodash: '4.17.21' });
      });
    });
  });

  given('dep added in both with different versions', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: {},
        ours: { lodash: '4.17.20' },
        theirs: { lodash: '4.17.22' },
      });

      then('higher version wins', () => {
        expect(result).toEqual({ lodash: '4.17.22' });
      });
    });
  });

  given('dep removed in ours, updated in theirs', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: { lodash: '4.17.20' },
        ours: {},
        theirs: { lodash: '4.17.22' },
      });

      then('dep is removed (removal wins)', () => {
        expect(result).toEqual({});
      });
    });
  });

  given('dep removed in theirs, updated in ours', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: { lodash: '4.17.20' },
        ours: { lodash: '4.17.22' },
        theirs: {},
      });

      then('dep is removed (removal wins)', () => {
        expect(result).toEqual({});
      });
    });
  });

  given('dep removed in both branches', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: { lodash: '4.17.20' },
        ours: {},
        theirs: {},
      });

      then('dep is removed', () => {
        expect(result).toEqual({});
      });
    });
  });

  given('empty section in ours', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: undefined,
        ours: undefined,
        theirs: { lodash: '4.17.21', express: '4.18.0' },
      });

      then('theirs section is used', () => {
        expect(result).toEqual({ lodash: '4.17.21', express: '4.18.0' });
      });
    });
  });

  given('empty section in theirs', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: undefined,
        ours: { lodash: '4.17.21', express: '4.18.0' },
        theirs: undefined,
      });

      then('ours section is used', () => {
        expect(result).toEqual({ lodash: '4.17.21', express: '4.18.0' });
      });
    });
  });

  given('multiple deps with mixed scenarios', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: {
          lodash: '4.17.20',
          express: '4.17.0',
          axios: '0.21.0',
        },
        ours: {
          lodash: '4.17.21',
          // express removed
          axios: '0.21.1',
          newDep: '1.0.0',
        },
        theirs: {
          lodash: '4.17.22',
          express: '4.18.0',
          axios: '0.21.2',
          anotherDep: '2.0.0',
        },
      });

      then('each dep resolved correctly', () => {
        expect(result).toEqual({
          lodash: '4.17.22', // theirs is higher
          // express removed (ours removed it)
          axios: '0.21.2', // theirs is higher
          newDep: '1.0.0', // added in ours
          anotherDep: '2.0.0', // added in theirs
        });
      });
    });
  });

  given('incomparable versions (file: protocol)', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: { localPkg: 'file:../local-v1' },
        ours: { localPkg: 'file:../local-v2' },
        theirs: { localPkg: 'file:../local-v3' },
      });

      then('ours is preferred for incomparable versions', () => {
        expect(result).toEqual({ localPkg: 'file:../local-v2' });
      });
    });
  });

  given('pre-release vs stable version', () => {
    when('merged', () => {
      const result = mergeDependencySection({
        base: { pkg: '1.0.0-beta.1' },
        ours: { pkg: '1.0.0-beta.2' },
        theirs: { pkg: '1.0.0' },
      });

      then('stable wins over pre-release', () => {
        expect(result).toEqual({ pkg: '1.0.0' });
      });
    });
  });
});
