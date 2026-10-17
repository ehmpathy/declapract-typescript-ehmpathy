import { promiseLambdaInvocation } from '../../__nonpublished_modules__/ahbode-standard-lambda-handler';
import { given, then, when } from 'test-fns';

import { handler } from './getWidget';

describe('getWidget', () => {
  given('[case1] a widget uuid', () => {
    when('[t0] the handler is invoked', () => {
      then('it responds', async () => {
        const response = await promiseLambdaInvocation({
          event: { widgetUuid: 'w-1' },
          handler,
        });
        expect(response).toBeDefined();
      });
    });
  });
});
