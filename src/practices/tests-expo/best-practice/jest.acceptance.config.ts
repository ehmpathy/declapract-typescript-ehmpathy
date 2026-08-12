/**
 * @jest-config-loader esbuild-register
 */
import type { Config } from 'jest';

// ensure tests run in utc, like they will on cicd and on server; https://stackoverflow.com/a/56277249/15593329
process.env.TZ = 'UTC';

// ensure tests run like on local machines, so snapshots are equal on local && cicd
process.env.FORCE_COLOR = 'true';

// https://jestjs.io/docs/configuration
const config: Config = {
  // jest-expo/web = jsdom + react-native-web, so acceptance tests exercise the web build
  // surface. (a repo that prefers a device/simulator acceptance harness, e.g. playwright
  // against the exported web app, swaps this out — the cicd-common shard runner reads the
  // jest config named here.)
  preset: 'jest-expo/web',

  verbose: true,
  reporters: [
    ['default', { summaryThreshold: 0 }], // ensure we always get a failure summary at the bottom, to avoid the hunt
    ['test-fns/slowtest.reporter.jest', { slow: '10s', output: '.log/slowtest/acceptance.report.json' }],
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
  },
  // pnpm-nested react-native/expo ESM must still transform (see jest.unit.config.ts).
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!.*(react-native|@react-native|expo|@expo|@unimodules|unimodules|@react-navigation|react-navigation|sentry-expo|native-base|@sentry))',
    'node_modules/(?!.pnpm)(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|react-navigation|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|@sentry)',
  ],
  testMatch: ['**/*.acceptance.test.{ts,tsx}', '!**/.agent/.cache/**', '!**/.yalc/**'],
  setupFilesAfterEnv: ['./jest.acceptance.env.ts'],

  // use 50% of threads to leave headroom for other processes
  maxWorkers: '50%', // https://stackoverflow.com/questions/71287710/why-does-jest-run-faster-with-maxworkers-50
};

// eslint-disable-next-line import/no-default-export
export default config;
