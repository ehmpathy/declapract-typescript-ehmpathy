/**
 * .what = the wave height in feet, from a swell height in meters
 */
export const getWaveHeight = (input: { meters: number }): number =>
  Math.round(input.meters * 3.28084);
