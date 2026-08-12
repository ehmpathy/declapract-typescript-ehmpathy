import { FileCheckType } from 'declapract';

import { check, fix } from './*.test.acceptance.ts.declapract';

// .note (rule.forbid.as-cast, option a — documented): the declapract context arg passed to fix
// below is a PARTIAL mock. fix here reads only `contents` and `relativeFilePath` — never the rest
// of FileCheckContext. the `as any` asserts that partial to the full type. this is the repo-wide
// test idiom (it appears across the peer `.declapract.test.ts` files, e.g. the __test_utils__
// peer); the removal path is a declapract-exported context test-factory, a repo-scoped sweep out
// of this wish's bound.

describe('old-extension-pattern **/*.test.acceptance.ts bad practice', () => {
  describe('check', () => {
    it('is FileCheckType.EXISTS', () => {
      expect(check).toBe(FileCheckType.EXISTS);
    });
  });

  describe('fix', () => {
    it('renames a .test.acceptance.ts file to .acceptance.test.ts', async () => {
      const context = {
        relativeFilePath: 'src/logic/getUser.test.acceptance.ts',
      };
      const result = await fix('some contents', context as any);
      expect(result).toEqual({
        contents: 'some contents',
        relativeFilePath: 'src/logic/getUser.acceptance.test.ts',
      });
    });

    it('renames only the tail extension, not a mid-path lookalike', async () => {
      // the regex is anchored at end ($), so a mid-path `test.acceptance.ts` segment is left alone
      const context = {
        relativeFilePath:
          'src/x.test.acceptance.ts.dir/getUser.test.acceptance.ts',
      };
      const result = await fix('c', context as any);
      expect(result.relativeFilePath).toEqual(
        'src/x.test.acceptance.ts.dir/getUser.acceptance.test.ts',
      );
    });

    it('is idempotent — an already-renamed path is left unchanged', async () => {
      // `.acceptance.test.ts` does not end in `.test.acceptance.ts`, so a re-run is a no-op
      const context = {
        relativeFilePath: 'src/logic/getUser.acceptance.test.ts',
      };
      const result = await fix('c', context as any);
      expect(result.relativeFilePath).toEqual(
        'src/logic/getUser.acceptance.test.ts',
      );
    });

    it('preserves null contents', async () => {
      const context = {
        relativeFilePath: 'src/logic/getUser.test.acceptance.ts',
      };
      const result = await fix(null, context as any);
      expect(result).toEqual({
        contents: null,
        relativeFilePath: 'src/logic/getUser.acceptance.test.ts',
      });
    });
  });
});
