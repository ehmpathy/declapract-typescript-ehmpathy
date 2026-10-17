import { given, then, when } from 'test-fns';

import { isOnRetiredLambdaTestLib } from '../../../../../../../utils/asSourceOnRunLambdaEndpoint';
import { fix } from './*.integration.test.ts.declapract';

const before = `import { promiseLambdaInvocation } from '../../__nonpublished_modules__/ahbode-standard-lambda-handler';
import { getError } from 'test-fns';

import { handler } from './getWidget';

describe('getWidget', () => {
  it('responds', async () => {
    const response = await promiseLambdaInvocation({ event: { widgetUuid: 'w-1' }, handler });
    expect(response).toBeDefined();
  });
});
`;

describe('ahbode-standard-lambda-handler integration tests (#650)', () => {
  given('[case1] a handler test on promiseLambdaInvocation', () => {
    when('[t0] it is fixed', () => {
      const after = fix(before, {} as any) as { contents: string };

      then('it lands on runLambdaEndpoint.onReferenced in one apply', () => {
        expect(after.contents).not.toContain('simple-lambda-testing-methods');
        expect(after.contents).not.toContain('promiseLambdaInvocation');
        expect(after.contents).toContain(
          "import { asLambdaEndpointOutput, runLambdaEndpoint } from 'sdk-aws-lambda';",
        );
        expect(after.contents).toContain(
          "runLambdaEndpoint.onReferenced({ event: { widgetUuid: 'w-1' }, handler }).then(asLambdaEndpointOutput)",
        );
        expect(after.contents).toMatchSnapshot();
      });

      then('a second pass is a no-op, and the retired-lib check does not detect it', () => {
        const twice = fix(after.contents, {} as any) as { contents: string };
        expect(twice.contents).toEqual(after.contents);
        expect(isOnRetiredLambdaTestLib({ contents: after.contents })).toBe(false);
      });
    });
  });
});
