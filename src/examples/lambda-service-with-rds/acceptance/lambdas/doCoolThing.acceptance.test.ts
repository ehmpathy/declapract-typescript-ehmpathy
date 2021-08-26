import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';

import { stage } from '../../src/utils/environment';
import { locally } from '../environment';

describe('sendMessage', () => {
  it('should be possible to invoke the lambda', async () => {
    const response = await invokeLambdaForTesting({
      service: '@declapract{variable.serviceName}',
      function: 'doCoolThing',
      stage,
      locally,
      event: {
        doIt: true,
      },
    });
    expect(response).toHaveProperty('coolThing');
  });
});
