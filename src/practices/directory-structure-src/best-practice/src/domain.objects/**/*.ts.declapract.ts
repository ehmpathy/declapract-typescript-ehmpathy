import { asPresenceCheck } from '../../../../../../utils/asPresenceCheck';

// domain objects are required - what is the purpose of a service without domain objects?
export const check = asPresenceCheck({
  expected: 'at least one domain object under src/domain.objects/',
  hint: 'declare the nouns this service operates on',
});
