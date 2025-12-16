import { check, fix } from './*.ts.declapract';

/**
 * .what = unit tests for relative-imports bad practice check/fix
 * .why = ensures detection and auto-fix of relative imports works correctly
 */
describe('relative-imports bad practice', () => {
  describe('check', () => {
    it('should match files with ../ imports', () => {
      const contents = `import { something } from '../utils/helper';`;
      expect(() =>
        check(contents, { relativeFilePath: 'src/domain/index.ts' } as any),
      ).not.toThrow();
    });

    it('should match files with deeply nested ../ imports', () => {
      const contents = `import { something } from '../../../utils/helper';`;
      expect(() =>
        check(contents, {
          relativeFilePath: 'src/domain/sub/deep/index.ts',
        } as any),
      ).not.toThrow();
    });

    it('should not match files with only ./ imports', () => {
      const contents = `import { something } from './helper';`;
      expect(() =>
        check(contents, { relativeFilePath: 'src/domain/index.ts' } as any),
      ).toThrow('does not match bad practice');
    });

    it('should not match files outside src/', () => {
      const contents = `import { something } from '../utils/helper';`;
      expect(() =>
        check(contents, { relativeFilePath: 'test/domain/index.ts' } as any),
      ).toThrow('does not match bad practice');
    });

    it('should not match practice template files in src/practices/', () => {
      const contents = `import { something } from '../utils/helper';`;
      expect(() =>
        check(contents, {
          relativeFilePath: 'src/practices/lint/best-practice/src/utils/config.ts',
        } as any),
      ).toThrow('does not match bad practice');
    });

    it('should match .declapract.ts files in src/practices/', () => {
      const contents = `import { something } from '../utils/helper';`;
      expect(() =>
        check(contents, {
          relativeFilePath:
            'src/practices/lint/bad-practices/example/src/file.ts.declapract.ts',
        } as any),
      ).not.toThrow();
    });

    it('should not match files with @src/ imports', () => {
      const contents = `import { something } from '@src/utils/helper';`;
      expect(() =>
        check(contents, { relativeFilePath: 'src/domain/index.ts' } as any),
      ).toThrow('does not match bad practice');
    });

    it('should not match empty files', () => {
      expect(() =>
        check('', { relativeFilePath: 'src/domain/index.ts' } as any),
      ).toThrow('does not match bad practice');
    });

    it('should not match null contents', () => {
      expect(() =>
        check(null as any, { relativeFilePath: 'src/domain/index.ts' } as any),
      ).toThrow('does not match bad practice');
    });
  });

  describe('fix', () => {
    it('should rewrite single ../ import to @src/', async () => {
      const contents = `import { helper } from '../utils/helper';`;
      const result = await fix(contents, {
        relativeFilePath: 'src/domain/index.ts',
      } as any);

      expect(result.contents).toBe(
        `import { helper } from '@src/utils/helper';`,
      );
    });

    it('should rewrite deeply nested imports', async () => {
      const contents = `import { helper } from '../../../utils/helper';`;
      const result = await fix(contents, {
        relativeFilePath: 'src/domain/sub/deep/index.ts',
      } as any);

      expect(result.contents).toBe(
        `import { helper } from '@src/utils/helper';`,
      );
    });

    it('should preserve ./ imports', async () => {
      const contents = `import { local } from './local';
import { parent } from '../parent';`;
      const result = await fix(contents, {
        relativeFilePath: 'src/domain/index.ts',
      } as any);

      expect(result.contents).toContain(`from './local'`);
      expect(result.contents).toContain(`from '@src/parent'`);
    });

    it('should handle multiple imports', async () => {
      const contents = `import { a } from '../utils/a';
import { b } from '../../shared/b';
import { c } from './local/c';`;
      const result = await fix(contents, {
        relativeFilePath: 'src/domain/sub/index.ts',
      } as any);

      expect(result.contents).toContain(`from '@src/domain/utils/a'`);
      expect(result.contents).toContain(`from '@src/shared/b'`);
      expect(result.contents).toContain(`from './local/c'`);
    });

    it('should return empty object for files outside src/', async () => {
      const contents = `import { helper } from '../utils/helper';`;
      const result = await fix(contents, {
        relativeFilePath: 'test/domain/index.ts',
      } as any);

      expect(result).toEqual({});
    });

    it('should return empty object for practice template files in src/practices/', async () => {
      const contents = `import { helper } from '../utils/helper';`;
      const result = await fix(contents, {
        relativeFilePath: 'src/practices/lint/best-practice/src/utils/config.ts',
      } as any);

      expect(result).toEqual({});
    });

    it('should fix .declapract.ts files in src/practices/', async () => {
      const contents = `import { helper } from '../utils/helper';`;
      const result = await fix(contents, {
        relativeFilePath:
          'src/practices/lint/bad-practices/example/src/domain/index.ts.declapract.ts',
      } as any);

      expect(result.contents).toContain(`from '@src/`);
    });

    it('should return empty object for null contents', async () => {
      const result = await fix(
        null as any,
        {
          relativeFilePath: 'src/domain/index.ts',
        } as any,
      );

      expect(result).toEqual({});
    });

    it('should NOT convert imports at root of src/ that go outside (../ from src/index.ts)', async () => {
      const contents = `import { helper } from '../other/helper';`;
      const result = await fix(contents, {
        relativeFilePath: 'src/index.ts',
      } as any);

      // ../other/helper from src/index.ts goes OUTSIDE src (to /other/helper), should NOT be converted
      expect(result.contents).toBe(`import { helper } from '../other/helper';`);
    });

    it('should NOT convert imports that go outside src/ (e.g., package.json from src/index.ts)', async () => {
      const contents = `import pkg from '../package.json';`;
      const result = await fix(contents, {
        relativeFilePath: 'src/index.ts',
      } as any);

      // ../package.json from src/index.ts goes OUTSIDE src, so should NOT become @src/package.json
      expect(result.contents).toBe(`import pkg from '../package.json';`);
    });

    it('should NOT convert imports that go outside src/ from nested file', async () => {
      const contents = `import pkg from '../../package.json';`;
      const result = await fix(contents, {
        relativeFilePath: 'src/utils/index.ts',
      } as any);

      // ../../package.json from src/utils/index.ts goes OUTSIDE src, so should NOT become @src/package.json
      expect(result.contents).toBe(`import pkg from '../../package.json';`);
    });

    it('should convert imports staying within src/ but NOT those going outside', async () => {
      const contents = `import { helper } from '../utils/helper';
import pkg from '../../package.json';`;
      const result = await fix(contents, {
        relativeFilePath: 'src/domain/index.ts',
      } as any);

      // ../utils/helper stays within src, should become @src/utils/helper
      expect(result.contents).toContain(`from '@src/utils/helper'`);
      // ../../package.json goes outside src, should remain unchanged
      expect(result.contents).toContain(`from '../../package.json'`);
    });
  });
});
