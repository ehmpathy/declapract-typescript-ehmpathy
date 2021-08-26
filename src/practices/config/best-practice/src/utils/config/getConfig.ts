// export a default instance of the config object
import ConfigCache from 'config-with-paramstore';

import { Config } from './Config';
import { stage } from '../environment';

export const configInstance = new ConfigCache();
export const getConfig = async (): Promise<Config> => configInstance.get(stage);
