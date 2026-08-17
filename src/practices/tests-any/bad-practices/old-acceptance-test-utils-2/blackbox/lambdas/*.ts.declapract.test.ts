import { fix } from './*.ts.declapract';

// .note (rule.forbid.as-cast, option a — documented): the declapract context arg passed to
// fix in the tests below is a PARTIAL mock — the fix reads only what it needs (`contents`,
// and `relativeFilePath` where a move applies), never the rest of FileFixContext. the
// `as any` asserts that partial to the full type. this is the repo-wide test idiom (it
// appears in ~68 peer .declapract.test.ts files, most already on main and untouched by this
// branch); the removal path is a declapract-exported context test-factory, a repo-scoped
// sweep out of this wish's bound.

describe('*.ts.declapract', () => {
  it('should be able to fix a test file using old acceptance test pattern', async () => {
    const exampleOldPatternContents = `
import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';

import { stage } from '../../src/utils/environment';
import { locally } from '../__test_utils__/environment';

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
