import { createCache } from 'simple-on-disk-cache';

export const getCacheDirectory = () => ({
  directoryToPersistTo: {
    mounted: { path: '/tmp/cache' },
    s3: { bucket: 'svc-cache', prefix: 'surf' },
  },
});

export const cache = createCache(getCacheDirectory());
