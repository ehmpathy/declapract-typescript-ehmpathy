import { given, then, when } from 'test-fns';

import { buildExpectedContent } from './.test.yml.declapract';

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
