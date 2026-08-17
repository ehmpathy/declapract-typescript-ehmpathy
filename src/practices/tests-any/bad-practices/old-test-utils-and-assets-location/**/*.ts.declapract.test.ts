import { check, fix } from './*.ts.declapract';

// .note (rule.forbid.as-cast, option a — documented): the declapract context arg passed to
// check/fix in the tests below is a PARTIAL mock. check/fix here read only `contents` and
// `relativeFilePath` — never the rest of FileCheckContext. the `as any` asserts that partial
// to the full type. this is the repo-wide test idiom (it appears in ~68 peer
// .declapract.test.ts files, most already on main and untouched by this branch); the removal
// path is a declapract-exported context test-factory, a repo-scoped sweep out of this wish's
// bound.

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

  describe('idempotency (rule.require.idempotent-fixes)', () => {
    it('fix(fix(x)) === fix(x) — the output is a fixed point', async () => {
      const contents = `import { exampleUser } from '../__test_utils__/exampleUser';
import fixture from '../__test_assets__/fixture.json';`;
      const { contents: once } = await fix(contents, {} as any);
      const { contents: twice } = await fix(once, {} as any);
      expect(twice).toBe(once);
    });

    it('check throws on the fixed output — the bad practice no longer matches, so declapract fix cannot loop', async () => {
      const contents = `import { exampleUser } from '../__test_utils__/exampleUser';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(() => check(fixed as string, {} as any)).toThrow(
        'does not match bad practice',
      );
    });
  });
});
