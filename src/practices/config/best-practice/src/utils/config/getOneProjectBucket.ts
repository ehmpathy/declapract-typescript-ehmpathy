import { getConfig } from './getConfig';

/**
 * .what = casts config coordinates into the project's s3 bucket name
 * .why = keeps the '<project>-<namespace>-<access>' pattern in one named place
 */
const asProjectBucketName = (input: {
  config: Awaited<ReturnType<typeof getConfig>>;
}): string =>
  [
    input.config.project,
    input.config.aws.namespace,
    input.config.environment.access,
  ].join('-');

/**
 * .what = gets the project's default s3 bucket, based on config
 */
export const getOneProjectBucket = async (): Promise<string> => {
  const config = await getConfig();
  return asProjectBucketName({ config });
};
