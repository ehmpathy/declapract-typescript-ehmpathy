import { createApiGatewayHandler } from 'simple-lambda-handlers';

import { log } from '../../utils/logger';
import { getWidgetSchema } from './getWidget.schema';

// an api-gateway handler CALL — the schema+invoke contract differs between the two
// frameworks, so the fix cannot rename-only; it must emit a loud review marker.
export const handler = createApiGatewayHandler({
  log,
  schema: getWidgetSchema,
  logic: async (event) => ({ widget: event.widgetId }),
  cors: true,
});
