import { asPresenceCheck } from '../../../../../../utils/asPresenceCheck';

// contract layer is required - there should be some contract in this service (api, sdk, cli, cmd)
export const check = asPresenceCheck({
  expected: 'at least one contract under src/contract/',
  hint: 'author the entrypoint this service exposes (an api, sdk, cli, or cmd)',
});
