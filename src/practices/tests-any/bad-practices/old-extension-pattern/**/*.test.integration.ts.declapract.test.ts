import { FileCheckType } from 'declapract';

import { check, fix } from './*.test.integration.ts.declapract';

// .note (rule.forbid.as-cast, option a — documented): the declapract context arg passed to fix
// below is a PARTIAL mock. fix here reads only `contents` and `relativeFilePath` — never the rest
// of FileCheckContext. the `as any` asserts that partial to the full type. this is the repo-wide
// test idiom (it appears across the peer `.declapract.test.ts` files, e.g. the __test_utils__
// peer); the removal path is a declapract-exported context test-factory, a repo-scoped sweep out
// of this wish's bound.

describe('old-extension-pattern **/*.test.integration.ts bad practice', () => {
  describe('check', () => {
    it('is FileCheckType.EXISTS', () => {
      expect(check).toBe(FileCheckType.EXISTS);
    });
  });

  describe('fix', () => {
    it('renames a .test.integration.ts file to .integration.test.ts', async () => {
      const context = {
        relativeFilePath: 'src/logic/getUser.test.integration.ts',
      };
      const result = await fix('some contents', context as any);
      expect(result).toEqual({
        contents: 'some contents',
        relativeFilePath: 'src/logic/getUser.integration.test.ts',
      });
    });

    it('renames only the tail extension, not a mid-path lookalike', async () => {
      // the regex is anchored at end ($), so a mid-path `test.integration.ts` segment is left alone
      const context = {
        relativeFilePath:
          'src/x.test.integration.ts.dir/getUser.test.integration.ts',
      };
      const result = await fix('c', context as any);
      expect(result.relativeFilePath).toEqual(
        'src/x.test.integration.ts.dir/getUser.integration.test.ts',
      );
    });

    it('is idempotent — an already-renamed path is left unchanged', async () => {
      // `.integration.test.ts` does not end in `.test.integration.ts`, so a re-run is a no-op
      const context = {
        relativeFilePath: 'src/logic/getUser.integration.test.ts',
      };
      const result = await fix('c', context as any);
      expect(result.relativeFilePath).toEqual(
        'src/logic/getUser.integration.test.ts',
      );
    });

    it('preserves null contents', async () => {
      const context = {
        relativeFilePath: 'src/logic/getUser.test.integration.ts',
      };
      const result = await fix(null, context as any);
      expect(result).toEqual({
        contents: null,
        relativeFilePath: 'src/logic/getUser.integration.test.ts',
      });
    });
  });
});
