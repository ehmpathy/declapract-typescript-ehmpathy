import { getConfig } from './getConfig';

describe('config', () => {
  it('should be able to get the config', async () => {
    const config = await getConfig();
    expect(Object.values(config).length).toBeGreaterThan(0);
  });
});
