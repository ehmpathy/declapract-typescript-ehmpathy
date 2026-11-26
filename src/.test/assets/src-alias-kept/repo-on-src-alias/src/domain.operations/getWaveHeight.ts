export const getWaveHeight = (input: { spot: string }): number =>
  input.spot === 'pipeline' ? 8 : 3;
