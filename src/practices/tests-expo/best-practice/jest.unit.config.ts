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
  // jest-expo wires up babel-preset-expo (metro's transform) + react-native module
  // resolution (platform suffixes, haste). this is what lets tests that reach the
  // expo/react-native boundary load, where a plain node preset cannot.
  preset: 'jest-expo',

  verbose: true,
  reporters: [
    ['default', { summaryThreshold: 0 }], // ensure we always get a failure summary at the bottom, to avoid the hunt
    ['test-fns/slowtest.reporter.jest', { slow: '10s', output: '.log/slowtest/unit.report.json' }],
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
  },
  // the jest-expo preset's transformIgnorePatterns assume a hoisted (flat) node_modules.
  // pnpm's `.pnpm/`-nested store ships react-native/expo as untranspiled ESM one layer
  // deeper, so add a `.pnpm/` branch that still transforms those families. a repo that
  // pulls other untranspiled-ESM packages (e.g. a native storage lib) appends its own
  // package names to BOTH branches.
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!.*(react-native|@react-native|expo|@expo|@unimodules|unimodules|@react-navigation|react-navigation|sentry-expo|native-base|@sentry))',
    'node_modules/(?!.pnpm)(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|react-navigation|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|@sentry)',
  ],
  testMatch: [
    // note: order matters
    '**/*.test.{ts,tsx}',
    '!**/*.acceptance.test.{ts,tsx}',
    '!**/*.integration.test.{ts,tsx}',
    '!**/.agent/.cache/**',
    '!**/.yalc/**',
  ],
  setupFilesAfterEnv: ['./jest.unit.env.ts'],

  // use 50% of threads to leave headroom for other processes
  maxWorkers: '50%', // https://stackoverflow.com/questions/71287710/why-does-jest-run-faster-with-maxworkers-50
};

// eslint-disable-next-line import/no-default-export
export default config;
