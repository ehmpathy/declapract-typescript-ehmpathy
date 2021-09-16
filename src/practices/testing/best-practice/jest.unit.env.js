/* eslint-disable global-require */
jest.mock('./src/utils/config/getConfig', () => ({
  getConfig: jest.fn().mockImplementation(() => require('./config/test.json')), // mock that getConfig just returns plaintext test env config in unit tests
}));
