/**
 * @jest-config-loader esbuild-register
 */
import type { Config } from 'jest';

const config: Config = { testMatch: ['**/*.test.ts'] };

export default config;
