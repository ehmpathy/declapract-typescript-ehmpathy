import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';
import { given, then, when } from 'test-fns';

import { locally, stage } from '../environment';

describe('getWidget', () => {
  given('a widget', () => {
    when('asked by uuid', () => {
      then('it responds', async () => {
        const response = await invokeLambdaForTesting({
          service: 'svc-widgets',
          function: 'getWidget',
          stage,
          locally,
          event: { widgetUuid: 'w-1' },
        });
        expect(response.widget).toBeDefined();
      });
    });
  });
});
