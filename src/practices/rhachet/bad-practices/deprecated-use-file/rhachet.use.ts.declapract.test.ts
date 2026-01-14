import { check, fix } from './rhachet.use.ts.declapract';
import { FileCheckType } from 'declapract';

describe('deprecated-use-file rhachet.use.ts', () => {
  it('should use EXISTS check type', () => {
    expect(check).toBe(FileCheckType.EXISTS);
  });

  it('should return null contents to delete the file', async () => {
    const contents = `export const rhachetConfig = {};`;
    const result = await fix(contents, {} as any);
    expect(result.contents).toBeNull();
  });

  it('should return null contents even when file is empty', async () => {
    const result = await fix('', {} as any);
    expect(result.contents).toBeNull();
  });

  it('should return null contents even when contents is undefined', async () => {
    const result = await fix(undefined, {} as any);
    expect(result.contents).toBeNull();
  });
});
