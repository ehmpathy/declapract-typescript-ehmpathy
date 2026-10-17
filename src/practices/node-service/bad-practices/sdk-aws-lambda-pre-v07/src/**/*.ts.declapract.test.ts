import { given, then, when } from 'test-fns';

import { check, fix } from './*.ts.declapract';

const context = {} as any;

const askHandlerBefore = `import { genLambdaEndpoint } from 'sdk-aws-lambda';
import { z } from 'zod';

import { log } from '@src/utils/logger';

export const handler = genLambdaEndpoint(
  {
    schema: { input: z.object({ widgetId: z.string() }), output: z.object({ ok: z.boolean() }) },
    invoke: async ({ event }, context) => {
      const found = await getWidget({ widgetId: event.widgetId }, context);
      return { ok: !!found, echo: { event } };
    },
  },
  { log },
);
`;

const apiHandlerBefore = `import { genLambdaEndpoint } from 'sdk-aws-lambda';

export const handler = genLambdaEndpoint.for.apiGateway({
  schema,
  invoke: async ({ event }) => ({ body: await doStuff(event) }),
});
`;

const sqsHandlerBefore = `import { genLambdaEndpoint } from 'sdk-aws-lambda';
import { extractTaskParcelFromSqsEvent } from 'simple-async-tasks';

export const handler = genLambdaEndpoint.forAsk({
  schema,
  invoke: async ({ payload }) => {
    const parcel = extractTaskParcelFromSqsEvent(payload);
    return execute(parcel);
  },
});
`;

describe('sdk-aws-lambda-pre-v07 src', () => {
  given('[case1] an ask handler on the bare genLambdaEndpoint call', () => {
    when('[t0] check', () => {
      then('detects the bad practice', () => {
        expect(() => check(askHandlerBefore, context)).not.toThrow();
      });
    });

    when('[t1] fix', () => {
      const fixed = fix(askHandlerBefore, context) as { contents: string };

      then('the call moves to .forAsk', () => {
        expect(fixed.contents).toContain('genLambdaEndpoint.forAsk(');
        expect(fixed.contents).not.toMatch(/genLambdaEndpoint\s*\(/);
      });

      then('the invoke input reads payload, body included', () => {
        expect(fixed.contents).toContain('invoke: async ({ payload }, context)');
        expect(fixed.contents).toContain('widgetId: payload.widgetId');
        expect(fixed.contents).not.toContain('event.widgetId');
      });

      then('a shorthand property keeps its key', () => {
        expect(fixed.contents).toContain('echo: { event: payload }');
      });

      then('the output matches snapshot', () => {
        expect(fixed.contents).toMatchSnapshot();
      });

      then('the fix is a fixed point, and check skips its output', () => {
        const twice = fix(fixed.contents, context) as { contents: string };
        expect(twice.contents).toEqual(fixed.contents);
        expect(() => check(fixed.contents, context)).toThrow();
      });
    });
  });

  given('[case2] an api-gateway handler on .for.apiGateway', () => {
    when('[t0] fix', () => {
      const fixed = fix(apiHandlerBefore, context) as { contents: string };

      then('the call moves to .forApiGateway, input to payload', () => {
        expect(fixed.contents).toContain('genLambdaEndpoint.forApiGateway({');
        expect(fixed.contents).not.toContain('.for.apiGateway');
        expect(fixed.contents).toContain(
          'invoke: async ({ payload }) => ({ body: await doStuff(payload) })',
        );
      });

      then('check skips its output, and a second fix is a no-op', () => {
        expect(() => check(fixed.contents, context)).toThrow();
        expect(
          (fix(fixed.contents, context) as { contents: string }).contents,
        ).toEqual(fixed.contents);
      });
    });
  });

  given('[case5] an api-gateway handler that reads the raw event beside the input (#646)', () => {
    const rawEventBefore = `import { genLambdaEndpoint } from 'sdk-aws-lambda';

export const handler = genLambdaEndpoint.for.apiGateway({
  schema,
  invoke: async ({ rawEvent, event }) => {
    log.info('called', { path: rawEvent.path, rawEvent });
    return { body: await doStuff(event) };
  },
});

export const handlerAliased = genLambdaEndpoint.for.apiGateway({
  schema,
  invoke: async ({ event: input, rawEvent }) => ({ body: await doStuff(input, rawEvent.headers) }),
});
`;

    when('[t0] fix', () => {
      const fixed = fix(rawEventBefore, context) as { contents: string };

      then('the old `event` reads payload, and the old `rawEvent` reads event', () => {
        expect(fixed.contents).toContain('invoke: async ({ event, payload }) => {');
        expect(fixed.contents).toContain("log.info('called', { path: event.path, rawEvent: event });");
        expect(fixed.contents).toContain('return { body: await doStuff(payload) };');
      });

      then('an aliased key moves its key alone, and the body reads its alias', () => {
        expect(fixed.contents).toContain(
          'invoke: async ({ payload: input, event }) => ({ body: await doStuff(input, event.headers) })',
        );
      });

      then('no `rawEvent` read is left behind', () => {
        expect(fixed.contents).not.toMatch(/rawEvent\./);
        expect(fixed.contents).not.toMatch(/\(\{[^)]*\brawEvent\b[^)]*\}\)/);
      });

      then('the output matches snapshot', () => {
        expect(fixed.contents).toMatchSnapshot();
      });

      then('check skips its output, and a second fix is a no-op', () => {
        expect(() => check(fixed.contents, context)).toThrow();
        expect(
          (fix(fixed.contents, context) as { contents: string }).contents,
        ).toEqual(fixed.contents);
      });
    });
  });

  given('[case3] an sqs handler on extractTaskParcelFromSqsEvent', () => {
    when('[t0] check + fix', () => {
      const fixed = fix(sqsHandlerBefore, context) as { contents: string };

      then('check detects it', () => {
        expect(() => check(sqsHandlerBefore, context)).not.toThrow();
      });

      then('a review marker lands above the parcel extract, body untouched', () => {
        expect(fixed.contents).toContain(
          '// @declapract:review — sdk-aws-lambda@0.7.1: move this sqs handler onto genLambdaEndpoint.forSqs.perRecord',
        );
        expect(fixed.contents.replace(/^.*@declapract:review.*\n/m, '')).toEqual(
          sqsHandlerBefore,
        );
      });

      then('check skips its output, and a second fix is a no-op', () => {
        expect(() => check(fixed.contents, context)).toThrow();
        expect(
          (fix(fixed.contents, context) as { contents: string }).contents,
        ).toEqual(fixed.contents);
      });
    });
  });

  given('[case4] a handler already on 0.7, or a file with no sdk import', () => {
    then('check skips a 0.7 handler', () => {
      expect(() =>
        check(
          `import { genLambdaEndpoint } from 'sdk-aws-lambda';\nexport const handler = genLambdaEndpoint.forAsk({ schema, invoke: async ({ payload }) => payload });\n`,
          context,
        ),
      ).toThrow();
    });

    then('check skips a same-named local fn', () => {
      expect(() =>
        check(
          `const genLambdaEndpoint = (x: any) => x;\nexport const handler = genLambdaEndpoint({ invoke: async ({ event }) => event });\n`,
          context,
        ),
      ).toThrow();
    });
  });
});
