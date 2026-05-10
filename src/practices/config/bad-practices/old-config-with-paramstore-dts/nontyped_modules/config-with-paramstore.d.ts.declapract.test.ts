import type { FileCheckContext } from 'declapract';

import { fix } from './config-with-paramstore.d.ts.declapract';

describe('old-config-with-paramstore-dts', () => {
  it('should delete the file', async () => {
    const contents = "declare module 'config-with-paramstore';";
    const result = await fix(contents, {} as FileCheckContext);

    expect(result.contents).toBeNull();
  });
});
