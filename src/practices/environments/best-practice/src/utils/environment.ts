import {
  IAMClient,
  ListAccountAliasesCommand,
  type ListAccountAliasesCommandOutput,
} from '@aws-sdk/client-iam';
import { UnexpectedCodePathError } from 'helpful-errors';
import { createCache } from 'simple-in-memory-cache';
import { createIsOfEnum, type Literalize } from 'type-fns';
import { withSimpleCache } from 'with-simple-cache';

import { log } from './logger';

export enum ConfigChoice {
  PRODUCTION = 'prod',
  DEVELOPMENT = 'dev',
  TEST = 'test',
}
export const isOfConfigChoice = createIsOfEnum(ConfigChoice);

export enum Access {
  PRODUCTION = 'prod',
  DEVELOPMENT = 'dev',
}
export const isOfAccess = createIsOfEnum(Access);

export enum Stage { // todo: deprecate stage
  PRODUCTION = 'prod',
  DEVELOPMENT = 'dev',
  TEST = 'test',
}
export const isOfStage = createIsOfEnum(Stage);

/**
 * ensure that the server is on UTC timezone
 *
 * why?
 * - non UTC timezone usage causes consistency problems and takes a while to track down
 * - by warning and correcting if the server the code runs on in is not in UTC, we avoid these issues
 * - instead, users should push down converting from UTC into the users TZ as far as possible
 */
const TIMEZONE = process.env.TZ;
if (TIMEZONE !== 'UTC') {
  log.debug(
    'env.TZ is not set to UTC. this can cause issues. updating this on your behalf',
    { found: TIMEZONE, desire: 'UTC' },
  );
  process.env.TZ = 'UTC';
}

/**
 * this allows us to infer what the stage should be in environments that do not have STAGE specified
 * - e.g., when running locally
 * - e.g., when running tests
 */
const inferStageFromNodeEnv = () => {
  const nodeEnv = process.env.NODE_ENV; // default to test if not defined
  if (!nodeEnv) throw new Error('process.env.NODE_ENV must be defined');
  if (nodeEnv === 'production') return Stage.PRODUCTION;
  if (nodeEnv === 'development') return Stage.DEVELOPMENT;
  if (nodeEnv === 'test') return Stage.TEST;
  throw new Error(`unexpected nodeEnv '${nodeEnv}'`);
};

/**
 * a method that exposes relevant environmental variables in a standard way
 */
export const getStage = (): Stage => {
  const stage = process.env.STAGE ?? inferStageFromNodeEnv(); // figure it out from NODE_ENV if not explicitly defined
  if (!stage) throw new Error('process.env.STAGE must be defined');
  if (!isOfStage(stage)) throw new Error(`invalid stage defined '${stage}'`);
  return stage;
};
export const stage: Stage = getStage(); // todo: deprecate

// export service client stage // todo: deprecate
export const serviceClientStage =
  stage === Stage.PRODUCTION ? Stage.PRODUCTION : Stage.DEVELOPMENT; // i.e., if its prod, hit prod. otherwise, dev

/**
 * .what = infer access (prod/dev) from curernt credentials
 *
 * .why?
 * - allows detection of the access grain we are currently authenticated into, if authenticated
 * - account aliases typically contain the environment (e.g., 'ahbode-dev', 'ahbode-prod')
 */
export const inferAccess = withSimpleCache(
  async (): Promise<Access | null> => {
    // skip aws api calls if no credentials are configured
    if (!process.env.AWS_PROFILE && !process.env.AWS_ACCESS_KEY_ID) return null;

    // grab the alias of the current account
    const iam = new IAMClient({});
    const response: ListAccountAliasesCommandOutput = await iam.send(
      new ListAccountAliasesCommand({}),
    );

    // infer access from alias
    const alias = response.AccountAliases?.[0];
    if (alias?.includes('prod')) return Access.PRODUCTION;
    if (alias?.includes('dev')) return Access.DEVELOPMENT;
    throw new Error(`Could not infer access from account alias '${alias}'`);
  },
  { cache: createCache() },
);

/**
 * infer stage from access (prod/dev)
 *
 * logic:
 * - if NODE_ENV === 'test', return test (test environment always uses test config)
 * - otherwise, defer to access from AWS credentials
 */
const inferConfigChoice = async (): Promise<ConfigChoice> => {
  // grab some facts
  const access = await inferAccess();
  const envarNode = process.env.NODE_ENV;
  const envarConfig = process.env.CONFIG ?? process.env.STAGE; // fallback to stage as alias to config choice

  // if access is against prod, then must use prod config; no exceptions
  if (access === Access.PRODUCTION) return ConfigChoice.PRODUCTION;

  // if access is against prep and asked for dev, then use dev config
  if (access === Access.DEVELOPMENT && envarConfig === 'dev')
    return ConfigChoice.DEVELOPMENT;

  // if access is against prep and asked for test, then use test config
  if (access === Access.DEVELOPMENT && envarNode === 'test')
    return ConfigChoice.TEST;

  // if access is against prep and not asked for test, then must use dev config
  if (access === Access.DEVELOPMENT) return ConfigChoice.DEVELOPMENT;

  // otherwise, unsupported
  throw new UnexpectedCodePathError(
    'Could not infer config choice: NODE_ENV is not test and no valid access could be determined',
    { access, envarNode, envarConfig },
  );
};

// export the v3 environmental variables
export interface Environment {
  /**
   * .what = the choice of config to execute against
   */
  config: Literalize<ConfigChoice>;

  /**
   * .what = the resources accessible from this environment, if any
   */
  access: Literalize<Access> | null;

  /**
   * .what = the server that hosts this environment
   */
  server: 'CICD' | 'AWS:LAMBDA' | 'LOCAL';
}
export const getEnvironment = async (): Promise<Environment> => ({
  config: await inferConfigChoice(),
  access: await inferAccess(),
  server: (() => {
    if (process.env.CI) return 'CICD' as const;
    if (process.env.LAMBDA_TASK_ROOT) return 'AWS:LAMBDA' as const;
    return 'LOCAL' as const; // default to local
  })(),
  // region: // todo
});
