import { access } from './src/utils/environment';

/**
 * specify that dynamodb should use the local dynamodb database, under the test access
 */
if (access === 'test')
  process.env.USE_CUSTOM_DYNAMODB_ENDPOINT = 'http://localhost:7337';
