// https://jestjs.io/docs/en/configuration.html
module.exports = {
  preset: 'ts-jest',
  verbose: true,
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/*.integration.test.ts'],
  setupFiles: ['core-js'],
  setupFilesAfterEnv: ['./jest.integration.env.js'],
};
