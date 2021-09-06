import { HasUuid } from 'simple-type-guards';
import { invokeLambdaFunction } from 'simple-lambda-client';

import { serviceClientStage } from '../../utils/environment';
import { log } from '../../utils/logger';

const service = 'svc-related-stuff';
const stage = serviceClientStage;

const doCoolRelatedThing = (event: {
  input: string;
}): Promise<{ output: HasUuid<any> }> =>
  invokeLambdaFunction({
    service,
    stage,
    function: 'doCoolRelatedThing',
    event,
    logDebug: log.debug,
  });

// replace me with a real client - or delete this file if clients are not needed in your service!
export const svcRelatedStuff = { doCoolRelatedThing };
