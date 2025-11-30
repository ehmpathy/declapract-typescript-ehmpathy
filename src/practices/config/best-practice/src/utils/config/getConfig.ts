// export a default instance of the config object
import ConfigCache from 'config-with-paramstore';

import { getEnvironment } from '../environment';
import { type Config } from './Config';

export const configInstance = new ConfigCache();
export const getConfig = async (): Promise<Config> =>
  configInstance.get((await getEnvironment()).config);
