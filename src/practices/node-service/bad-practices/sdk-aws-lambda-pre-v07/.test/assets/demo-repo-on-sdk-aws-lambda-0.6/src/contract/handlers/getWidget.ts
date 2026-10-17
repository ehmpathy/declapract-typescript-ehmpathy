import { genLambdaEndpoint } from 'sdk-aws-lambda';
import { z } from 'zod';

import { log } from '@src/utils/logger';

// an ask handler on the pre-0.7 bare call, which reads its input as `event`
export const handler = genLambdaEndpoint(
  {
    schema: {
      input: z.object({ widgetId: z.string() }),
      output: z.object({ widgetId: z.string() }),
    },
    invoke: async ({ event }) => ({ widgetId: event.widgetId }),
  },
  { log },
);
