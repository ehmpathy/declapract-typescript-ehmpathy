import { given, then, when } from 'test-fns';

import { check, fix } from './*.ts.declapract';

const BEFORE = `import { createCache } from 'simple-on-disk-cache';

export const getCacheDirectory = () => ({
  directoryToPersistTo: {
    mounted: { path: '/tmp/cache' },
    s3: { bucket: 'svc-cache', prefix: 'surf' },
  },
});

export const cache = createCache(getCacheDirectory());
`;

describe('cache cache-directory-options src files (#644)', () => {
  given('[case1] a getCacheDirectory with directoryToPersistTo and s3', () => {
    then('the check flags it', () => {
      expect(() => check(BEFORE, {} as any)).not.toThrow();
    });

    when('[t0] the fix runs', () => {
      then('a review line lands above each retired option and names `directory` and async get()', async () => {
        const { contents: after } = await fix(BEFORE, {} as any);
        const lines = after!.split('\n');
        const persistIndex = lines.findIndex((line) =>
          line.includes('directoryToPersistTo: {'),
        );
        const s3Index = lines.findIndex((line) => line.includes('s3: {'));
        expect(lines[persistIndex - 1]).toContain('// @declapract:review:');
        expect(lines[persistIndex - 1]).toContain('`directory`');
        expect(lines[s3Index - 1]).toContain('await');
        // no code line is rewritten
        expect(after!.replace(/^.*@declapract:review.*\n/gm, '')).toEqual(BEFORE);
        expect(after).toMatchSnapshot('getCacheDirectory — after');
      });

      then('a second fix pass is a no-op', async () => {
        const { contents: once } = await fix(BEFORE, {} as any);
        const { contents: twice } = await fix(once!, {} as any);
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case2] a file with an s3 key and no cache in sight', () => {
    then('the check skips it', () => {
      expect(() =>
        check(`export const config = { s3: { bucket: 'waves' } };`, {} as any),
      ).toThrow('does not match bad practice');
    });
  });

  given('[case4] a 0.17.3 cache whose cloud path is an s3:// uri', () => {
    // the shape of config/best-practice/src/utils/config/getOneCacheDirectory.ts
    const CLOUD_URI = `import { sdkAwsS3 } from 'sdk-aws-s3';
import type { DirectoryToPersistTo } from 'simple-on-disk-cache';

export const getOneCacheDirectory = async (): Promise<DirectoryToPersistTo> => ({
  cloud: {
    path: \`s3://\${bucket}/purpose=cache\`,
    via: sdkAwsS3,
  },
});
`;

    then('the check skips it, so the config template converges', () => {
      expect(() => check(CLOUD_URI, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    then('the fix stamps no marker on the uri line', async () => {
      const { contents: after } = await fix(CLOUD_URI, {} as any);
      expect(after).toEqual(CLOUD_URI);
    });
  });

  given('[case3] a cache on the 0.17.3 `directory` option', () => {
    then('the check skips it', () => {
      expect(() =>
        check(
          `import { createCache } from 'simple-on-disk-cache';
export const getCacheDirectory = () => ({ directory: { mounted: { path: '/tmp' } } });`,
          {} as any,
        ),
      ).toThrow('does not match bad practice');
    });
  });
});
