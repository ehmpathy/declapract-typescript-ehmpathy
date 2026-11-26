import { getSurfReport } from '@src/contract/getSurfReport';

jest.mock('@src/domain.operations/getWaveHeight');

export const useSurfReport = () => getSurfReport({ spot: 'pipeline' });
