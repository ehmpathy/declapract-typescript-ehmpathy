import { getConfig } from './config';

describe('config', () => {
  it('should be able to retrieve the config', async () => {
    await getConfig();
  });
});
