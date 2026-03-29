import { FileCheckType } from 'declapract';

import { check, fix } from './use.apikeys.json.declapract';

describe('old-use-apikeys use.apikeys.json', () => {
  it('should check for file existence', () => {
    expect(check).toEqual(FileCheckType.EXISTS);
  });

  it('should return null contents to delete the file', async () => {
    const result = await fix('{"keys": []}', {} as any);
    expect(result.contents).toBeNull();
  });
});
