import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';

import { locally } from '../__test_utils__/environment';

describe('addDecoratedImage', () => {
  it('it should be possible to add a decorated image', async () => {
    const response = await invokeLambdaForTesting({
      service: 'svc-images',
      function: 'addDecoratedImage',
      locally,
      event: {
        url: 'https://some.url',
        description: 'bo vine at his gig, moooooin the lawn',
        focalArea: null,
      },
    });
    expect(response.image).toHaveProperty('uuid');
  });
});
