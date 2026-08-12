import { FileCheckType } from 'declapract';

import { check, fix } from './*.declapract';

// .note (rule.forbid.as-cast, option a — documented): the declapract context arg passed to
// check/fix in the tests below is a PARTIAL mock. check/fix here read only `contents` and
// `relativeFilePath` — never the rest of FileCheckContext. the `as any` asserts that partial
// to the full type. this is the repo-wide test idiom (it appears in ~68 peer
// .declapract.test.ts files, most already on main and untouched by this branch); the removal
// path is a declapract-exported context test-factory, a repo-scoped sweep out of this wish's
// bound.

describe('old-test-utils-and-assets-location **/__test_utils__/**/* bad practice', () => {
  describe('check', () => {
    it('should be FileCheckType.EXISTS', () => {
      expect(check).toBe(FileCheckType.EXISTS);
    });
  });

  describe('fix', () => {
    it('should move file from __test_utils__ to .test.utils', async () => {
      const contents = 'some file contents';
      const context = {
        relativeFilePath: 'src/domain/__test_utils__/exampleUser.ts',
      };

      const result = await fix(contents, context as any);

      expect(result).toEqual({
        contents: 'some file contents',
        relativeFilePath: 'src/domain/.test.utils/exampleUser.ts',
      });
    });

    it('should handle nested __test_utils__ paths', async () => {
      const contents = 'nested file contents';
      const context = {
        relativeFilePath: 'src/logic/__test_utils__/nested/deep/helper.ts',
      };

      const result = await fix(contents, context as any);

      expect(result).toEqual({
        contents: 'nested file contents',
        relativeFilePath: 'src/logic/.test.utils/nested/deep/helper.ts',
      });
    });

    it('should handle null contents', async () => {
      const context = {
        relativeFilePath: 'src/__test_utils__/file.ts',
      };

      const result = await fix(null, context as any);

      expect(result).toEqual({
        contents: null,
        relativeFilePath: 'src/.test.utils/file.ts',
      });
    });
  });
});
