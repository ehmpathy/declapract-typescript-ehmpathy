import { access } from './src/utils/environment';

if (access === 'test')
  process.env.USE_CUSTOM_DYNAMODB_ENDPOINT = 'http://localhost:9999';
