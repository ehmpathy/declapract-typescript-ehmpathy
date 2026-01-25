import { given, then, when } from 'test-fns';

import { buildExpectedContent, fix } from './.test.yml.declapract';

describe('.test.yml.declapract buildExpectedContent', () => {
  given('a template with workflow_call inputs', () => {
    const template = `name: .test

on:
  workflow_call:
    inputs:
      creds-aws-role-arn:
        description: "creds for aws"
        required: false
        type: string
      creds-aws-region:
        description: "region"
        required: false
        type: string
        default: "us-east-1"

permissions:
  id-token: write
  contents: read

jobs:
  install:
    uses: ./.github/workflows/.install.yml

  test-integration:
    runs-on: ubuntu-24.04
    needs: [install]
    steps:
      - name: checkout
        uses: actions/checkout@v4
`;

    when('no apikeys are required', () => {
      then('it should return template unchanged', () => {
        const result = buildExpectedContent({
          template,
          apikeys: [],
        });

        expect(result).toEqual(template);
      });
    });

    when('one apikey is required', () => {
      then('it should add secrets declaration to workflow_call', () => {
        const result = buildExpectedContent({
          template,
          apikeys: ['ANTHROPIC_API_KEY'],
        });

        expect(result).toContain('secrets:');
        expect(result).toContain('ANTHROPIC_API_KEY:');
        expect(result).toContain(
          'description: "api key for anthropic api key"',
        );
        expect(result).toContain('required: false');
      });

      then('it should add env block to test-integration job', () => {
        const result = buildExpectedContent({
          template,
          apikeys: ['ANTHROPIC_API_KEY'],
        });

        expect(result).toContain('env:');
        expect(result).toContain(
          'ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}',
        );
      });

      then('it should match expected snapshot', () => {
        const result = buildExpectedContent({
          template,
          apikeys: ['ANTHROPIC_API_KEY'],
        });

        expect(result).toMatchSnapshot();
      });
    });

    when('multiple apikeys are required', () => {
      then('it should add all secrets to workflow_call', () => {
        const result = buildExpectedContent({
          template,
          apikeys: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
        });

        expect(result).toContain('ANTHROPIC_API_KEY:');
        expect(result).toContain('OPENAI_API_KEY:');
      });

      then('it should add all env vars to test-integration job', () => {
        const result = buildExpectedContent({
          template,
          apikeys: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
        });

        expect(result).toContain(
          'ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}',
        );
        expect(result).toContain(
          'OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}',
        );
      });

      then('it should match expected snapshot', () => {
        const result = buildExpectedContent({
          template,
          apikeys: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
        });

        expect(result).toMatchSnapshot();
      });
    });
  });
});

describe('.test.yml.declapract fix', () => {
  given('a test-types job without build step before test:types', () => {
    // content that lacks the build step before test:types
    const contentWithoutBuildStep = `name: .test

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
    needs: [install, test-shards-omit]
    steps:
      - name: checkout
        uses: actions/checkout@v4

      - name: set node-version
        uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"

      - name: get node-modules from cache
        uses: actions/cache/restore@v4
        with:
          path: ./node_modules
          key: \${{ needs.install.outputs.node-modules-cache-key }}

      - name: test:types
        run: npm run test:types
`;

    // template that includes the build step before test:types
    const templateWithBuildStep = `name: .test

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
    needs: [install, test-shards-omit]
    steps:
      - name: checkout
        uses: actions/checkout@v4

      - name: set node-version
        uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"

      - name: get node-modules from cache
        uses: actions/cache/restore@v4
        with:
          path: ./node_modules
          key: \${{ needs.install.outputs.node-modules-cache-key }}

      - name: build
        run: npm run build # build before test:types, to ensure .dist/ artifacts are importable for blackbox tests

      - name: test:types
        run: npm run test:types
`;

    when('fix is applied', () => {
      then('the fixed content should include build step before test:types', async () => {
        // verify the input lacks the build step
        expect(contentWithoutBuildStep).not.toContain('- name: build');

        // create mock context with template
        const mockContext = {
          declaredFileContents: templateWithBuildStep,
          getProjectRootDirectory: () => '/mock/project',
        };

        const result = await fix(contentWithoutBuildStep, mockContext as any);

        // verify the output has the build step
        expect(result.contents).toContain('- name: build');
        expect(result.contents).toContain(
          'run: npm run build # build before test:types, to ensure .dist/ artifacts are importable for blackbox tests',
        );
      });

      then('build step should appear before test:types step', async () => {
        const mockContext = {
          declaredFileContents: templateWithBuildStep,
          getProjectRootDirectory: () => '/mock/project',
        };

        const result = await fix(contentWithoutBuildStep, mockContext as any);
        const contents = result.contents ?? '';

        // find positions of both steps
        const buildStepIndex = contents.indexOf('- name: build');
        const testTypesStepIndex = contents.indexOf('- name: test:types');

        // build step should come before test:types step
        expect(buildStepIndex).toBeGreaterThan(-1);
        expect(testTypesStepIndex).toBeGreaterThan(-1);
        expect(buildStepIndex).toBeLessThan(testTypesStepIndex);
      });
    });
  });
});
