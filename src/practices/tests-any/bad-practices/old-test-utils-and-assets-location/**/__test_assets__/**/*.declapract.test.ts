import { FileCheckType } from 'declapract';

import { check, fix } from './*.declapract';

// .note (rule.forbid.as-cast, option a — documented): the declapract context arg passed to fix
// below is a PARTIAL mock. fix here reads only `contents` and `relativeFilePath` — never the rest
// of FileCheckContext. the `as any` asserts that partial to the full type. this mirrors the
// __test_utils__ peer test in this same practice; the removal path is a declapract-exported
// context test-factory, a repo-scoped sweep out of this wish's bound.

describe('old-test-utils-and-assets-location **/__test_assets__/**/* bad practice', () => {
  describe('check', () => {
    it('is FileCheckType.EXISTS', () => {
      expect(check).toBe(FileCheckType.EXISTS);
    });
  });

  describe('fix', () => {
    it('moves a file from __test_assets__ to .test.assets', async () => {
      const context = {
        relativeFilePath: 'src/domain/__test_assets__/exampleUser.json',
      };
      const result = await fix('some contents', context as any);
      expect(result).toEqual({
        contents: 'some contents',
        relativeFilePath: 'src/domain/.test.assets/exampleUser.json',
      });
    });

    it('handles a nested __test_assets__ path', async () => {
      const context = {
        relativeFilePath: 'src/logic/__test_assets__/nested/deep/fixture.json',
      };
      const result = await fix('nested contents', context as any);
      expect(result).toEqual({
        contents: 'nested contents',
        relativeFilePath: 'src/logic/.test.assets/nested/deep/fixture.json',
      });
    });

    it('is idempotent — an already-moved path is left unchanged', async () => {
      // `.test.assets/` holds no `__test_assets__/` segment, so a re-run is a no-op
      const context = {
        relativeFilePath: 'src/domain/.test.assets/exampleUser.json',
      };
      const result = await fix('c', context as any);
      expect(result.relativeFilePath).toEqual(
        'src/domain/.test.assets/exampleUser.json',
      );
    });

    it('handles null contents', async () => {
      const context = {
        relativeFilePath: 'src/__test_assets__/file.json',
      };
      const result = await fix(null, context as any);
      expect(result).toEqual({
        contents: null,
        relativeFilePath: 'src/.test.assets/file.json',
      });
    });
  });
});
