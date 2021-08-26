module.exports = {
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testEnvironment: 'node',
  setupFiles: ['core-js'],
  testMatch: ['**/*.test.ts', '!**/*.integration.test.ts', '!**/*.acceptance.test.ts'],
  setupFilesAfterEnv: ['./jest.unit.env.js'],
};
