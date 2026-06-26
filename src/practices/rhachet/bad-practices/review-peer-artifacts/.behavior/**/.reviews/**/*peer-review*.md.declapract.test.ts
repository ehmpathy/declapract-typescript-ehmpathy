import { FileCheckType } from 'declapract';

import { check, fix } from './*peer-review*.md.declapract';

describe('review-peer-artifacts flat peer-review', () => {
  it('should use EXISTS check type', () => {
    expect(check).toBe(FileCheckType.EXISTS);
  });

  it('should return null contents to delete the file', async () => {
    const contents = `# peer review\n\nsome feedback`;
    const result = await fix(contents, {} as any);
    expect(result.contents).toBeNull();
  });

  it('should return null contents even when contents is undefined', async () => {
    const result = await fix(undefined, {} as any);
    expect(result.contents).toBeNull();
  });
});
