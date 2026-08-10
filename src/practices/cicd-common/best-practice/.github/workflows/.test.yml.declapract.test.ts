import { given, then, when } from 'test-fns';

import { fix } from './.test.yml.declapract';

/**
 * .note = the two strings below are synthetic, not copies of the real `.test.yml`. they are
 *         pass-through props: this unit proves only that `fix` discards its input and echoes
 *         `declaredFileContents`. their `actions/checkout@v4` needs no pin — a pin here would
 *         read as though the suite verified real content, and it compares a hand-written string
 *         to itself through a mocked context.
 * .note = delivery of the real pinned file is proven one grain up, by an executed pipeline —
 *         `[case2]` of `src/practices/cicd-common/.declapract.integration.test.ts`. that case
 *         exists because `.test.yml` is the only pinned template with a hand-written fix, and
 *         `src/actionPins.declapract.integration.test.ts` asserts that set stays exactly one file wide
 */
describe('.test.yml.declapract', () => {
  given('a workflow file with outdated content', () => {
    const outdatedContent = `name: .test

on:
  workflow_call:
    inputs:
      creds-aws-role-arn:
        description: "creds for aws"
        required: false
        type: string

permissions:
  id-token: write
  contents: read

jobs:
  install:
    uses: ./.github/workflows/.install.yml

  test-types:
    runs-on: ubuntu-24.04
    needs: [install]
    steps:
      - name: checkout
        uses: actions/checkout@v4
`;

    const templateContent = `name: .test

on:
  workflow_call:
    inputs:
      creds-aws-role-arn:
        description: "creds for aws, specifies the role to assume via oidc. if not provided, aws auth is skipped"
        required: false
        type: string

permissions:
  id-token: write
  contents: read

jobs:
  install:
    uses: ./.github/workflows/.install.yml

  test-types:
    runs-on: ubuntu-24.04
    needs: [install]
    steps:
      - name: checkout
        uses: actions/checkout@v4

      - name: build
        run: npm run build # build before test:types, to ensure .dist/ artifacts are importable for blackbox tests
`;

    when('fix is applied', () => {
      then('it should return the template content', async () => {
        const mockContext = {
          declaredFileContents: templateContent,
          getProjectRootDirectory: () => '/mock/project',
        };

        const result = await fix(outdatedContent, mockContext as any);

        expect(result.contents).toEqual(templateContent);
        expect(result).toMatchSnapshot();
      });

      then('the template content should include the build step', async () => {
        const mockContext = {
          declaredFileContents: templateContent,
          getProjectRootDirectory: () => '/mock/project',
        };

        const result = await fix(outdatedContent, mockContext as any);

        expect(result.contents).toContain('- name: build');
        expect(result.contents).toContain('npm run build');
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case2] empty input content', () => {
    const templateContent = `name: .test
on:
  workflow_call:
`;

    when('fix is applied', () => {
      then('it should still return the template content', async () => {
        // fix ignores input content; it only uses context.declaredFileContents
        const mockContext = {
          declaredFileContents: templateContent,
          getProjectRootDirectory: () => '/mock/project',
        };

        const result = await fix('', mockContext as any);

        expect(result.contents).toEqual(templateContent);
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case3] context with null declared file contents', () => {
    when('fix is applied', () => {
      then('it should return empty string', async () => {
        const mockContext = {
          declaredFileContents: null,
          getProjectRootDirectory: () => '/mock/project',
        };

        const result = await fix('any content', mockContext as any);

        expect(result.contents).toEqual('');
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case4] context with undefined declared file contents', () => {
    when('fix is applied', () => {
      then('it should return empty string', async () => {
        const mockContext = {
          declaredFileContents: undefined,
          getProjectRootDirectory: () => '/mock/project',
        };

        const result = await fix('any content', mockContext as any);

        expect(result.contents).toEqual('');
        expect(result).toMatchSnapshot();
      });
    });
  });
});
