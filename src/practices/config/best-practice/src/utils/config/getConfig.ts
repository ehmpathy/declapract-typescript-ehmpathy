import {
  genGetConfig,
  genSdkConfigSupplierAwsParameterStore,
} from 'sdk-config';
import { createCache } from 'simple-in-memory-cache';

import { envStatic } from '../environment';
import { schema } from './config.schema';

export const getConfig = genGetConfig({
  schema,
  statics: 'config/*.json',
  cache: createCache({ expiration: { minutes: 5 } }),
  suppliers: [genSdkConfigSupplierAwsParameterStore()],
  environment: {
    config: envStatic.config,
    server: envStatic.server,
  },
});
