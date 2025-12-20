import { FileCheckType } from 'declapract';

import { check, fix } from './changelog.md.declapract';

describe('has-changelog-file changelog.md', () => {
  it('should check for file existence', () => {
    expect(check).toEqual(FileCheckType.EXISTS);
  });

  it('should return null contents to delete the file', async () => {
    const result = await fix('# Changelog\n\n## 1.0.0\n- Initial release', {} as any);
    expect(result.contents).toBeNull();
  });
});
