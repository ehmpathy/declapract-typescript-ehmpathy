import { FileCheckType } from 'declapract';

import { check, fix } from './*.declapract';

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
