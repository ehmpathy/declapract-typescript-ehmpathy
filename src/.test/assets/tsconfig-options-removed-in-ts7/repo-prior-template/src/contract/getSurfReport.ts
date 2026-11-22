// an import through the template's `@src/` alias, the one a `rootDir: src` build can rewrite
import { getWaveHeight } from '@src/logic/getWaveHeight';

/**
 * .what = a surf report line for a swell height in meters
 */
export const getSurfReport = (input: { meters: number }): string => `${getWaveHeight(input)}ft`;
