// an import through the template's `@/` alias, which the build must rewrite past the `rootDir: src` lead
import { getWaveHeight } from '@/src/domain.operations/getWaveHeight';

/**
 * .what = a surf report line for a swell height in meters
 */
export const getSurfReport = (input: { meters: number }): string => `${getWaveHeight(input)}ft`;
