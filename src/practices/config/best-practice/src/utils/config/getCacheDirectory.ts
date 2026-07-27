import { sdkAwsS3 } from 'sdk-aws-s3';
import type { DirectoryToPersistTo } from 'simple-on-disk-cache';
import { isPresent } from 'type-fns';

import { getConfig } from './getConfig';

/**
 * .what = gets the project's default s3 bucket, based on config
 */
export const getProjectBucket = async (): Promise<string> => {
  const config = await getConfig();
  const bucket = [
    config.project,
    config.aws.namespace,
    config.environment.access,
  ].join('-');
  return bucket;
};

/**
 * .what = gets the project's default cache directory, based on config
 */
export const getCacheDirectory = async (
  input: { scope?: string } = {},
): Promise<DirectoryToPersistTo> => {
  // build the s3 uri prefix from the project bucket + cache scope
  const bucket = await getProjectBucket();
  const prefix = [
    'purpose=cache',
    input.scope ? `scope=${input.scope}` : undefined,
  ]
    .filter(isPresent)
    .join('/');

  // persist to s3 via the sdk-aws-s3 cloud adapter
  return {
    cloud: {
      path: `s3://${bucket}/${prefix}`,
      via: sdkAwsS3,
    },
  };
};
