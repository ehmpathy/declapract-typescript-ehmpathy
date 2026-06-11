import { check, fix } from './*.ts.declapract';

describe('uni-time bad practice source files', () => {
  it('should match files that import from @ehmpathy/uni-time', () => {
    const contents = `import { IsoDateTime } from '@ehmpathy/uni-time';`;
    expect(() => check(contents, {} as any)).not.toThrow();
  });

  it('should not match files without @ehmpathy/uni-time imports', () => {
    const contents = `import { IsoDateTime } from 'iso-time';`;
    expect(() => check(contents, {} as any)).toThrow('does not match bad practice');
  });

  it('should replace @ehmpathy/uni-time imports with iso-time', async () => {
    const contents = `import { IsoDateTime } from '@ehmpathy/uni-time';`;
    const { contents: fixed } = await fix(contents, {} as any);

    expect(fixed).toContain("from 'iso-time'");
    expect(fixed).not.toContain('@ehmpathy/uni-time');
  });

  it('should replace multiple @ehmpathy/uni-time imports', async () => {
    const contents = `
import { IsoDateTime } from '@ehmpathy/uni-time';
import { IsoDate } from '@ehmpathy/uni-time';
`;
    const { contents: fixed } = await fix(contents, {} as any);

    expect(fixed).not.toContain('@ehmpathy/uni-time');
    expect(fixed?.match(/from 'iso-time'/g)?.length).toBe(2);
  });
});
