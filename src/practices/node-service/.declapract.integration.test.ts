import { readFileSync } from 'node:fs';

import { given, then, when } from 'test-fns';
import { getModuleExportsFromTsSource } from '../../utils/getModuleExportsFromTsSource';

/**
 * .what = holds the `sdkAwsLambdaAskAncient` template to its runtime behavior (#631)
 * .why  = an ancient peer differs on two axes at once — the `-dev-` address and the flat payload.
 *         the helper exists to bind both, so this test runs the real template source and asserts
 *         the ask it makes carries BOTH: `struct: { payload: 'ancient' }` and the ancient slug.
 * .note = INTEGRATION by rule.forbid.unit.remote-boundaries: it reads the template file. the
 *         template's imports look up in the consumer's tree, so it is transpiled and run with
 *         stubs for `sdk-aws-lambda` and the env helper (the environments practice's exemplar).
 */

const ASK_ANCIENT_PATH = `${__dirname}/best-practice/src/access/sdks/sdkAwsLambdaAskAncient.ts`;

/**
 * .what = run the template once, with the ancient env helper stubbed to a given slug, and return
 *         the args the template handed to `askLambdaEndpoint`
 */
const runAskAncient = async (input: {
  slug: 'dev' | 'prod';
}): Promise<{ input: any; context: any }> => {
  const calls: { input: any; context: any }[] = [];
  const requireStub = (id: string): unknown => {
    if (id === 'sdk-aws-lambda')
      return {
        askLambdaEndpoint: async (askInput: any, askContext: any) => {
          calls.push({ input: askInput, context: askContext });
          return { ok: true };
        },
      };
    if (id.includes('sdkAwsLambdaEnvAccessAncient'))
      return { sdkAwsLambdaEnvAccessAncient: () => input.slug };
    return {};
  };
  const { sdkAwsLambdaAskAncient } = getModuleExportsFromTsSource<{
    sdkAwsLambdaAskAncient: (input: any, context: any) => Promise<unknown>;
  }>({ source: readFileSync(ASK_ANCIENT_PATH, 'utf8'), requireStub });
  await sdkAwsLambdaAskAncient!(
    { which: { service: 'svc-widgets', function: 'getWidget' }, event: { uuid: 'w-1' } },
    { log: console },
  );
  return calls[0]!;
};

describe('node-service — sdkAwsLambdaAskAncient (#631)', () => {
  given('[case1] the template, run below prod', () => {
    when('[t0] it asks an ancient peer', () => {
      then('it sends the bare event in the ancient payload struct, to the dev slug', async () => {
        const call = await runAskAncient({ slug: 'dev' });
        expect(call.input).toEqual({
          which: { service: 'svc-widgets', function: 'getWidget' },
          event: { uuid: 'w-1' },
          struct: { payload: 'ancient' },
        });
        expect(call.context.env.access).toEqual('dev');
        expect(call.context.log).toBe(console);
      });
    });
  });

  given('[case2] the template, run at prod', () => {
    then('it addresses the prod slug, still in the ancient struct', async () => {
      const call = await runAskAncient({ slug: 'prod' });
      expect(call.context.env.access).toEqual('prod');
      expect(call.input.struct).toEqual({ payload: 'ancient' });
    });
  });

  given('[case3] the template source', () => {
    then('it holds exactly one documented cast, tied to sdk-aws-lambda#42', () => {
      const source = readFileSync(ASK_ANCIENT_PATH, 'utf8');
      expect(source.match(/\) as [A-Z]\w+/g)).toEqual([
        ') as EnvironmentAccessTier',
      ]);
      expect(source).toContain('sdk-aws-lambda#42');
      expect(source).toMatchSnapshot('sdkAwsLambdaAskAncient.ts source');
    });

    then('its context cache is typed by TResponse, not unknown (F88: TS2345 on every lambda usecase)', () => {
      // `AskLambdaEndpointContext` is `Parameters<typeof askLambdaEndpoint>[1]`, which fixes the
      // cache to `SimpleCache<unknown>`; hand that to `askLambdaEndpoint<TRequest, TResponse>` and
      // tsc rejects it. the context must come from the generic instantiated on this call's types.
      const source = readFileSync(ASK_ANCIENT_PATH, 'utf8');
      expect(source).not.toContain('AskLambdaEndpointContext');
      expect(source).toContain(
        'Parameters<typeof askLambdaEndpoint<TRequest, TResponse>>[1]',
      );
    });
  });
});
