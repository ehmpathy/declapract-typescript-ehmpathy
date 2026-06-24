import { getEnvironment } from 'sdk-environment';
import { genLogMethods } from 'sdk-logs';

export const log = genLogMethods({
  env: { commit: getEnvironment.static().commit },
});
