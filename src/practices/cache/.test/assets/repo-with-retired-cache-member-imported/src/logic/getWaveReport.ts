import { withSimpleCaching } from 'with-simple-caching';

export const getWaveReport = withSimpleCaching(async () => 'swell', {
  cache: new Map(),
});
