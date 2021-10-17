/* eslint-disable global-require */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { stage, Stage } = require('./src/utils/environment');

// eslint-disable-next-line no-undef
jest.mock('./src/utils/config/getConfig', () => ({
  // eslint-disable-next-line no-undef
  getConfig: jest.fn().mockImplementation(() => require('./config/test.json')), // mock that getConfig just returns plaintext test env config in unit tests
}));

// sanity check that integration tests are only run in 'test' environment (if they are run in prod environment, we will load a bunch of junk data into our prod databases, which is no bueno)
if (stage !== Stage.TEST)
  throw new Error(`unit-test is not targeting stage 'test'`);
