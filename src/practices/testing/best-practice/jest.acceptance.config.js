// https://jestjs.io/docs/en/configuration.html
module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  verbose: true,
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/*.acceptance.test.ts'],
  setupFiles: ['core-js'],
  setupFilesAfterEnv: ['./jest.acceptance.env.js'],
};
