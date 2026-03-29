import { FileCheckType } from 'declapract';

import { check, fix } from './use.apikeys.sh.declapract';

describe('old-use-apikeys use.apikeys.sh', () => {
  it('should check for file existence', () => {
    expect(check).toEqual(FileCheckType.EXISTS);
  });

  it('should return null contents to delete the file', async () => {
    const result = await fix('#!/bin/sh\n# content', {} as any);
    expect(result.contents).toBeNull();
  });
});
