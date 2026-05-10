import { stage } from './src/utils/environment';

/**
 * specify that dynamodb should use the local dynamodb database, if running in test env
 */
if (stage === 'test')
  process.env.USE_CUSTOM_DYNAMODB_ENDPOINT = 'http://localhost:7337';
