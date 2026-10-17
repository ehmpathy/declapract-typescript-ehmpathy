import { asTestKindPresenceCheck } from '../../../../../utils/asTestKindPresenceCheck';

// there should prolly be atleast one integration test per project, in either suffix form (#679)
export const check = asTestKindPresenceCheck({
  dir: 'src',
  suffixOld: '.integration.test.ts',
  suffixSeam: '._.intg.test.ts',
});
