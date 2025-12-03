import { check, fix } from './*.ts.declapract';

describe('error-fns bad practice source files', () => {
  it('should match files that import from @ehmpathy/error-fns', () => {
    const contents = `import { UnexpectedCodePathError } from '@ehmpathy/error-fns';`;

    expect(() => check(contents, {} as any)).not.toThrow();
  });

  it('should not match files without @ehmpathy/error-fns imports', () => {
    const contents = `import { something } from 'other-package';`;

    expect(() => check(contents, {} as any)).toThrow(
      'does not match bad practice',
    );
  });

  it('should replace @ehmpathy/error-fns imports with helpful-errors', async () => {
    const contents = `import { UnexpectedCodePathError } from '@ehmpathy/error-fns';

export const doSomething = () => {
  throw new UnexpectedCodePathError('should not happen');
};`;

    const { contents: fixed } = await fix(contents, {} as any);

    expect(fixed).toContain("from 'helpful-errors'");
    expect(fixed).not.toContain('@ehmpathy/error-fns');
  });

  it('should replace multiple @ehmpathy/error-fns imports', async () => {
    const contents = `import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import { AnotherError } from '@ehmpathy/error-fns';`;

    const { contents: fixed } = await fix(contents, {} as any);

    expect(fixed)
      .toBe(`import { UnexpectedCodePathError } from 'helpful-errors';
import { AnotherError } from 'helpful-errors';`);
  });
});
