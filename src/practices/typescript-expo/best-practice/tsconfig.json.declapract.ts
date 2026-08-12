import { FileCheckType } from 'declapract';

/**
 * .what = the expo tsconfig: extends `expo/tsconfig.base` (jsx, react-native module
 *         resolution) instead of the node16 `@tsconfig/node20` base.
 * .why  = CONTAINS, not EQUALS, so an app that has already customized its expo tsconfig
 *         (extra paths, an app-specific include) is NOT clobbered — the check only asserts
 *         the expo base + core `@src`/`@assets` paths are present. a greenfield expo repo
 *         gets this emitted by `declapract fix`; a repo like app-protools-native (already
 *         `extends: expo/tsconfig.base`) already satisfies it.
 */
export const check = FileCheckType.CONTAINS;
