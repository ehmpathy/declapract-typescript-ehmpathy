import { invokeLambdaFunction } from 'simple-lambda-client';

import { stage } from '@src/utils/environment';

/**
 * .what = asks svc-widgets for the price of one widget
 * .why = the demo input for the simple-lambda-client migration
 */
export const getWidgetPrice = async (input: { widgetUuid: string }) => {
  const result = await invokeLambdaFunction({
    service: 'svc-widgets',
    function: 'getWidgetPrice',
    stage,
    event: { widgetUuid: input.widgetUuid },
  });
  return result;
};
