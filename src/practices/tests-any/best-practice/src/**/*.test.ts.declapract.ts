import { asPresenceCheck } from '../../../../../utils/asPresenceCheck';

// there should prolly be atleast one unit test per project
export const check = asPresenceCheck({
  expected: 'at least one test file under src/ named *.test.ts',
  hint: 'add a unit test beside the code it covers (e.g. *._.unit.test.ts)',
});
