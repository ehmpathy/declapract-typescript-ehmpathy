// export a default instance of the config object
import ConfigCache from 'config-with-paramstore';

import { stage } from '../environment';
import { Config } from './Config';

export const configInstance = new ConfigCache();
export const getConfig = async (): Promise<Config> => configInstance.get(stage);
