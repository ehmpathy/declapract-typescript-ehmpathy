// a bare import, which `baseUrl: "./src"` resolved, then one through each alias a `rootDir: src` build can rewrite
import { getWaveHeight } from 'logic/getWaveHeight';

import { getWaveHeight as getWaveHeightViaSrc } from '@src/logic/getWaveHeight';
import { getWaveHeight as getWaveHeightViaTilde } from '~/logic/getWaveHeight';

/**
 * .what = a surf report line for a swell height in meters, read through each import path
 */
export const getSurfReport = (input: { meters: number }): string =>
  [getWaveHeight, getWaveHeightViaSrc, getWaveHeightViaTilde]
    .map((read) => `${read(input)}ft`)
    .join(' · ');
