import { ConstraintError } from 'helpful-errors';
import {
  asApiGatewayResponseSchema,
  asLambdaEvent,
  genLambdaEndpoint,
  runLambdaEndpoint,
} from 'sdk-aws-lambda';
import { given, then, useThen, when } from 'test-fns';
import { z } from 'zod';

import { asSourceOnRunLambdaEndpoint } from './asSourceOnRunLambdaEndpoint';

/**
 * .what = proves, by real use, that the #650 codemod owes no ancient pin
 * .why  = the pin existed only because sdk-aws-lambda 0.7.1 answered a contemp api gateway frame
 *         with a 500. on 0.7.2 (sdk-aws-lambda#51) the contemp default frames it right, so the
 *         nested read the codemod writes must pass against a real forApiGateway handler, run via
 *         runLambdaEndpoint with no struct. on 0.7.1 this suite goes red (the 500)
 */
describe('asSourceOnRunLambdaEndpoint, by real use on sdk-aws-lambda', () => {
  given('[case1] a forApiGateway endpoint that rejects an absent thread', () => {
    const handler = genLambdaEndpoint.forApiGateway({
      schema: {
        input: z.object({ payload: z.object({ threadUuid: z.string() }) }),
        output: asApiGatewayResponseSchema({
          payload: z.object({ sent: z.boolean() }),
        }),
      },
      invoke: async ({ payload }) => {
        throw new ConstraintError('thread does not exist', {
          threadUuid: payload.threadUuid,
        });
      },
    });

    when('[t0] the codemod moves a flat 400 read', () => {
      const flatSource = `import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';

it('rejects an absent thread', async () => {
  const result = await invokeLambdaForTesting({ service: 'svc-gateway', function: 'sendChatMessage', event });
  expect(JSON.parse(result.body).errorMessage).toContain('thread does not exist');
  expect(JSON.parse(result.body).errorType).toEqual('ConstraintError');
});
`;
      const movedSource = asSourceOnRunLambdaEndpoint({ contents: flatSource });

      then('the read is nested, and no call is pinned', () => {
        expect(movedSource).toContain(
          "expect(JSON.parse(result.body).error.message).toContain('thread does not exist');",
        );
        expect(movedSource).toContain(
          "expect(JSON.parse(result.body).error.class).toEqual('ConstraintError');",
        );
        expect(movedSource).not.toContain('struct:');
      });
    });

    when('[t1] the endpoint runs via runLambdaEndpoint, with no struct', () => {
      const result = useThen('the run returns', async () =>
        runLambdaEndpoint.onReferenced({
          event: asLambdaEvent.fromApiGateway({
            body: { threadUuid: 'absent' },
            httpMethod: 'POST',
          }),
          handler,
        }),
      );

      then('the wire answers a 400, not a 500', () => {
        expect((result as { statusCode: number }).statusCode).toEqual(400);
      });

      then('the rewritten reads pass against the real body', () => {
        // the exact assertions the codemod wrote in [t0]
        expect(JSON.parse((result as { body: string }).body).error.message).toContain(
          'thread does not exist',
        );
        expect(JSON.parse((result as { body: string }).body).error.class).toEqual(
          'ConstraintError',
        );
      });
    });
  });
});
