import { fix } from './*.ts.declapract';

describe('*.ts.declapract', () => {
  it('should be able to fix a test file using old acceptance test pattern', async () => {
    const exampleOldPatternContents = `
import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';

import { stage } from '../../src/utils/environment';
import { locally } from '../_utils/environment';

describe('addDecoratedImage', () => {
  it('it should be possible to add a decorated image', async () => {
    // create the curation;
    const response = await invokeLambdaForTesting({
      service: 'svc-images',
      function: 'addDecoratedImage',
      locally,
      stage,
      event: {
        url:
          'https://some.url',
        description: 'Bo Vine at his gig, moooooin the lawn',
        focalArea: null,
      },
    });
    expect(response.image).toHaveProperty('uuid');
    expect(response.image.uuid).toContain('-'); // i.e., its a proper uuid
  });
});
    `.trim();
    const { contents: fixedContents } = await fix(exampleOldPatternContents, {
      projectVariables: { projectName: 'svc-notifications' },
    } as any);
    expect(fixedContents).toContain(
      `import { locally } from '../environment';`,
    );
    expect(fixedContents).toMatchSnapshot();
  });
});
