import { asTestKindPresenceCheck } from '../../../../../utils/asTestKindPresenceCheck';

// there should be at least one acceptance test, in either suffix form (#679)
export const check = asTestKindPresenceCheck({
  dir: 'blackbox',
  suffixOld: '.acceptance.test.ts',
  suffixSeam: '._.acpt.test.ts',
});
