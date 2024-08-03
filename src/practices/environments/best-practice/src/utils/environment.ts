import { createIsOfEnum } from 'type-fns';

import { log } from './logger';

export enum Stage {
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
  log.warn(
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
const getEnvironment = () => {
  const stage = process.env.STAGE ?? inferStageFromNodeEnv(); // figure it out from NODE_ENV if not explicitly defined
  if (!stage) throw new Error('process.env.STAGE must be defined');
  if (!isOfStage(stage)) throw new Error(`invalid stage defined '${stage}'`);
  return { stage };
};

// export stage immediately, since it does not change; // todo: replace this with env.access
export const { stage } = getEnvironment();

// export service client stage
export const serviceClientStage =
  stage === Stage.PRODUCTION ? Stage.PRODUCTION : Stage.DEVELOPMENT; // i.e., if its prod, hit prod. otherwise, dev

// export whether we were asked to run locally; // todo, replace this with env.server
export const locally = process.env.LOCALLY === 'true'; // whether we want to acceptance test locally or deployed lambda
