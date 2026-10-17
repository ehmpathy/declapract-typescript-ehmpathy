import { askLambdaEndpoint, type AskLambdaEndpointContext } from 'sdk-aws-lambda';

export const getJob = (
  event: { jobUuid: string },
  context: AskLambdaEndpointContext,
): Promise<{ job: { uuid: string } | null }> =>
  askLambdaEndpoint(
    { which: { service: 'svc-jobs', function: 'getJob' }, event },
    context,
  );
