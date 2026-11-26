import { getWaveHeight } from '@src/domain.operations/getWaveHeight';

// the retired @src/ alias in a comment stays as written; only a quoted specifier moves
export const getSurfReport = (input: { spot: string }): string =>
  `${input.spot}: ${getWaveHeight({ spot: input.spot })}ft`;
