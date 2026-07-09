import { given, then, when } from 'test-fns';

import { detectRemovalIntent } from './detectRemovalIntent';

describe('detectRemovalIntent', () => {
  given('dep in base and ours, not in theirs', () => {
    when('detected', () => {
      const result = detectRemovalIntent({
        depName: 'lodash',
        base: { lodash: '4.17.21' },
        ours: { lodash: '4.17.21' },
        theirs: {},
      });

      then('removed is true', () => {
        expect(result.removed).toBe(true);
      });

      then('removedIn is theirs', () => {
        expect(result.removedIn).toEqual('theirs');
      });
    });
  });

  given('dep in base and theirs, not in ours', () => {
    when('detected', () => {
      const result = detectRemovalIntent({
        depName: 'lodash',
        base: { lodash: '4.17.21' },
        ours: {},
        theirs: { lodash: '4.17.21' },
      });

      then('removed is true', () => {
        expect(result.removed).toBe(true);
      });

      then('removedIn is ours', () => {
        expect(result.removedIn).toEqual('ours');
      });
    });
  });

  given('dep in base, not in ours or theirs', () => {
    when('detected', () => {
      const result = detectRemovalIntent({
        depName: 'lodash',
        base: { lodash: '4.17.21' },
        ours: {},
        theirs: {},
      });

      then('removed is true', () => {
        expect(result.removed).toBe(true);
      });

      then('removedIn is both', () => {
        expect(result.removedIn).toEqual('both');
      });
    });
  });

  given('dep not in base, in ours only', () => {
    when('detected', () => {
      const result = detectRemovalIntent({
        depName: 'lodash',
        base: {},
        ours: { lodash: '4.17.21' },
        theirs: {},
      });

      then('removed is false (it was added)', () => {
        expect(result.removed).toBe(false);
      });

      then('removedIn is null', () => {
        expect(result.removedIn).toBeNull();
      });
    });
  });

  given('dep not in base, in theirs only', () => {
    when('detected', () => {
      const result = detectRemovalIntent({
        depName: 'lodash',
        base: {},
        ours: {},
        theirs: { lodash: '4.17.21' },
      });

      then('removed is false (it was added)', () => {
        expect(result.removed).toBe(false);
      });

      then('removedIn is null', () => {
        expect(result.removedIn).toBeNull();
      });
    });
  });

  given('dep in all three branches', () => {
    when('detected', () => {
      const result = detectRemovalIntent({
        depName: 'lodash',
        base: { lodash: '4.17.21' },
        ours: { lodash: '4.17.22' },
        theirs: { lodash: '4.17.23' },
      });

      then('removed is false', () => {
        expect(result.removed).toBe(false);
      });

      then('removedIn is null', () => {
        expect(result.removedIn).toBeNull();
      });
    });
  });

  given('undefined sections', () => {
    when('base is undefined', () => {
      const result = detectRemovalIntent({
        depName: 'lodash',
        base: undefined,
        ours: { lodash: '4.17.21' },
        theirs: { lodash: '4.17.21' },
      });

      then('treated as not in base (not a removal)', () => {
        expect(result.removed).toBe(false);
        expect(result.removedIn).toBeNull();
      });
    });

    when('ours is undefined', () => {
      const result = detectRemovalIntent({
        depName: 'lodash',
        base: { lodash: '4.17.21' },
        ours: undefined,
        theirs: { lodash: '4.17.21' },
      });

      then('treated as removed in ours', () => {
        expect(result.removed).toBe(true);
        expect(result.removedIn).toEqual('ours');
      });
    });

    when('theirs is undefined', () => {
      const result = detectRemovalIntent({
        depName: 'lodash',
        base: { lodash: '4.17.21' },
        ours: { lodash: '4.17.21' },
        theirs: undefined,
      });

      then('treated as removed in theirs', () => {
        expect(result.removed).toBe(true);
        expect(result.removedIn).toEqual('theirs');
      });
    });
  });
});
