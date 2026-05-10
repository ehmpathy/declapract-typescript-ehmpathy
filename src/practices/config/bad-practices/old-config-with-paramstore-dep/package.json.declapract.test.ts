import type { FileCheckContext } from 'declapract';

import { fix } from './package.json.declapract';

describe('old-config-with-paramstore-dep', () => {
  it('should remove config-with-paramstore from dependencies', async () => {
    const contents = JSON.stringify(
      {
        dependencies: {
          'config-with-paramstore': '1.0.0',
          'sdk-config': '1.0.0',
        },
      },
      null,
      2,
    );

    const result = await fix(contents, {} as FileCheckContext);
    const parsed = JSON.parse(result.contents!);

    expect(parsed.dependencies['config-with-paramstore']).toBeUndefined();
    expect(parsed.dependencies['sdk-config']).toBe('1.0.0');
  });
});
