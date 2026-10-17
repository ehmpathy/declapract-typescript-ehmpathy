import { askLambdaEndpoint, type AskLambdaEndpointContext } from 'sdk-aws-lambda';

export const getQuote = (
  event: { quoteUuid: string },
  context: AskLambdaEndpointContext,
): Promise<{ quote: { uuid: string } | null }> =>
  askLambdaEndpoint(
    { which: { service: 'svc-quotes', function: 'getQuote' }, event },
    context,
  );
