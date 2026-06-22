import { UnexpectedCodePathError } from 'helpful-errors';
import { getError } from 'test-fns';

import { check, fix } from './*.ts.declapract';

describe('local-error-imports bad practice source files', () => {
  describe('check', () => {
    it('should match files that import UnexpectedCodePathError from relative path', () => {
      const contents = `import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';`;

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files that import BadRequestError from @src alias', () => {
      const contents = `import { BadRequestError } from '@src/utils/errors/BadRequestError';`;

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files that import from domain.operations path', () => {
      const contents = `import { UnexpectedCodePathError } from '@src/domain.operations/UnexpectedCodePathError';`;

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files that import type from local path', () => {
      const contents = `import type { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';`;

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not match files with helpful-errors imports', async () => {
      const contents = `import { UnexpectedCodePathError } from 'helpful-errors';`;

      const error = await getError(() => check(contents, {} as any));
      expect(error).toBeInstanceOf(UnexpectedCodePathError);
      expect(error.message).toContain('no local error imports found');
    });

    it('should not match files with custom error class imports', async () => {
      const contents = `import { UserInputError } from '../../utils/errors/UserInputError';`;

      const error = await getError(() => check(contents, {} as any));
      expect(error).toBeInstanceOf(UnexpectedCodePathError);
      expect(error.message).toContain('no local error imports found');
    });

    it('should not match files with no error imports', async () => {
      const contents = `import { util } from 'other-package';`;

      const error = await getError(() => check(contents, {} as any));
      expect(error).toBeInstanceOf(UnexpectedCodePathError);
      expect(error.message).toContain('no local error imports found');
    });

    it('should not match string literals that look like imports', async () => {
      const contents = `const msg = "import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError'";`;

      const error = await getError(() => check(contents, {} as any));
      expect(error).toBeInstanceOf(UnexpectedCodePathError);
      expect(error.message).toContain('no local error imports found');
    });

    it('should not match imports inside comments', async () => {
      const contents = `// import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';`;

      const error = await getError(() => check(contents, {} as any));
      expect(error).toBeInstanceOf(UnexpectedCodePathError);
      expect(error.message).toContain('no local error imports found');
    });

    it('should match multi-line imports', () => {
      const contents = `import {
  UnexpectedCodePathError,
} from '../../utils/errors/UnexpectedCodePathError';`;

      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match aliased imports', () => {
      const contents = `import { UnexpectedCodePathError as UCError } from '../../utils/errors/UnexpectedCodePathError';`;

      expect(() => check(contents, {} as any)).not.toThrow();
    });
  });

  describe('fix', () => {
    it('should replace relative path import with helpful-errors', async () => {
      const contents = `import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';

export const doStuff = () => {
  throw new UnexpectedCodePathError('should not happen');
};`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("from 'helpful-errors'");
      expect(fixed).not.toContain('../../utils/errors/');
    });

    it('should replace @src alias import with helpful-errors', async () => {
      const contents = `import { BadRequestError } from '@src/utils/errors/BadRequestError';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import { BadRequestError } from 'helpful-errors';`);
    });

    it('should replace domain.operations path import', async () => {
      const contents = `import { UnexpectedCodePathError } from '@src/domain.operations/UnexpectedCodePathError';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(
        `import { UnexpectedCodePathError } from 'helpful-errors';`,
      );
    });

    it('should replace multiple local error imports', async () => {
      const contents = `import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';
import { BadRequestError } from '../../../utils/errors/BadRequestError';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import { UnexpectedCodePathError } from 'helpful-errors';
import { BadRequestError } from 'helpful-errors';`);
    });

    it('should not modify custom error class imports', async () => {
      const contents = `import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';
import { UserInputError } from '../../utils/errors/UserInputError';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("from 'helpful-errors'");
      expect(fixed).toContain("import { UserInputError } from '../../utils/errors/UserInputError';");
    });

    it('should handle mixed imports in same file', async () => {
      const contents = `import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';
import { util } from 'other-package';
import { HelpfulError } from '@src/errors/HelpfulError';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import { UnexpectedCodePathError } from 'helpful-errors';
import { util } from 'other-package';
import { HelpfulError } from 'helpful-errors';`);
    });

    it('should not modify string literals that look like imports', async () => {
      const contents = `const msg = "import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError'";`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(contents);
    });

    it('should not modify imports inside comments', async () => {
      const contents = `// import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(contents);
    });

    it('should replace import type from local path', async () => {
      const contents = `import type { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import type { UnexpectedCodePathError } from 'helpful-errors';`);
    });

    it('should replace multi-line imports', async () => {
      const contents = `import {
  UnexpectedCodePathError,
} from '../../utils/errors/UnexpectedCodePathError';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import {
  UnexpectedCodePathError,
} from 'helpful-errors';`);
    });

    it('should replace aliased imports', async () => {
      const contents = `import { UnexpectedCodePathError as UCError } from '../../utils/errors/UnexpectedCodePathError';`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toBe(`import { UnexpectedCodePathError as UCError } from 'helpful-errors';`);
    });
  });
});
