import { sdkAwsS3 } from 'sdk-aws-s3';
import type { DirectoryToPersistTo } from 'simple-on-disk-cache';
import { isPresent } from 'type-fns';

import { getOneProjectBucket } from './getOneProjectBucket';

/**
 * .what = casts a cache scope into its s3 uri prefix path
 * .why = keeps the 'purpose=cache[/scope=<scope>]' pattern in one named place
 */
const asCachePrefix = (input: { scope: string | null }): string =>
  ['purpose=cache', input.scope ? `scope=${input.scope}` : undefined]
    .filter(isPresent)
    .join('/');

/**
 * .what = gets the project's default cache directory, based on config
 */
export const getOneCacheDirectory = async (
  input: { scope: string | null },
): Promise<DirectoryToPersistTo> => {
  // get the project bucket, then the scoped cache prefix
  const bucket = await getOneProjectBucket();
  const prefix = asCachePrefix({ scope: input.scope });

  // persist to s3 via the sdk-aws-s3 cloud adapter
  return {
    cloud: {
      path: `s3://${bucket}/${prefix}`,
      via: sdkAwsS3,
    },
  };
};
