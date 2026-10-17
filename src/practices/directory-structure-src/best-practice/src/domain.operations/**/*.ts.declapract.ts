import { asPresenceCheck } from '../../../../../../utils/asPresenceCheck';

// domain operations are required - there should be business logic in the service
export const check = asPresenceCheck({
  expected: 'at least one domain operation under src/domain.operations/',
  hint: 'declare the operations this service performs',
});
