import { check, fix } from './*.ts.declapract';

describe('old-test-utils-and-assets-location **/*.ts bad practice', () => {
  describe('check', () => {
    it('should not throw if __test_utils__ is found in imports (bad practice detected)', () => {
      const contents = `import { exampleUser } from '../__test_utils__/exampleUser';`;

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not throw if __test_assets__ is found in imports (bad practice detected)', () => {
      const contents = `import fixture from '../__test_assets__/fixture.json';`;

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should throw if neither __test_utils__ nor __test_assets__ found (not bad practice)', () => {
      const contents = `import { exampleUser } from '../.test.utils/exampleUser';`;

      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    it('should throw if file has no test directory imports (not bad practice)', () => {
      const contents = `import { something } from './something';`;

      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });
  });

  describe('fix', () => {
    it('should replace __test_utils__ with .test.utils in imports', async () => {
      const contents = `import { exampleUser } from '../__test_utils__/exampleUser';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(
        `import { exampleUser } from '../.test.utils/exampleUser';`,
      );
    });

    it('should replace __test_assets__ with .test.assets in imports', async () => {
      const contents = `import fixture from '../__test_assets__/fixture.json';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import fixture from '../.test.assets/fixture.json';`);
    });

    it('should replace both __test_utils__ and __test_assets__ in the same file', async () => {
      const contents = `import { exampleUser } from '../__test_utils__/exampleUser';
import fixture from '../__test_assets__/fixture.json';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed)
        .toBe(`import { exampleUser } from '../.test.utils/exampleUser';
import fixture from '../.test.assets/fixture.json';`);
    });

    it('should return empty object if no contents', async () => {
      const result = await fix(null as any, {} as any);

      expect(result).toEqual({});
    });
  });
});
