import type { FileCheckContext } from 'declapract';

import { check, fix } from './*.ts.declapract';

const mockContext = {} as FileCheckContext;

describe('npm-uuidv4 source file codemod', () => {
  describe('check', () => {
    it('should match files that import from uuidv4', () => {
      const contents = `import { uuid } from 'uuidv4';`;
      expect(() => check(contents, mockContext)).not.toThrow();
    });

    it('should not match files without uuidv4 imports', () => {
      const contents = `import { getUuid } from 'uuid-fns';`;
      expect(() => check(contents, mockContext)).toThrow(
        'does not match bad practice',
      );
    });
  });

  describe('fix', () => {
    it('should replace uuid import with getUuid aliased as uuid from uuid-fns', () => {
      const contents = `import { uuid } from 'uuidv4';

const id = uuid();`;

      const result = fix(contents, mockContext);
      expect(result.contents).toContain(
        "import { getUuid as uuid } from 'uuid-fns'",
      );
      expect(result.contents).toContain('uuid()'); // call site unchanged
      expect(result.contents).not.toContain('uuidv4');
    });

    it('should handle aliased imports', () => {
      const contents = `import { uuid as generateId } from 'uuidv4';

const id = generateId();`;

      const result = fix(contents, mockContext);
      expect(result.contents).toContain(
        "import { getUuid as generateId } from 'uuid-fns'",
      );
      expect(result.contents).toContain('generateId()');
    });

    it('should handle double-quoted imports', () => {
      const contents = `import { uuid } from "uuidv4";`;

      const result = fix(contents, mockContext);
      expect(result.contents).toContain(
        "import { getUuid as uuid } from 'uuid-fns'",
      );
    });
  });
});
