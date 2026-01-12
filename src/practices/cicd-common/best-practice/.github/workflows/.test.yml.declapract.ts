import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { readUseApikeysConfig } from '../../../../../utils/readUseApikeysConfig';

/**
 * .what = builds the expected .test.yml content with apikey secrets injected
 * .why = single source of truth for both check and fix
 */
export const buildExpectedContent = (input: {
  template: string;
  apikeys: string[];
}): string => {
  let result = input.template;

  // if no apikeys, return template as-is
  if (!input.apikeys.length) {
    return result;
  }

  // build secrets declaration block for workflow_call
  const secretsDeclaration = input.apikeys
    .map(
      (key) =>
        `      ${key}:\n        description: "api key for ${key.toLowerCase().replace(/_/g, ' ')}"\n        required: false`,
    )
    .join('\n');

  // build env block for test-integration job
  const envBlock = input.apikeys
    .map((key) => `          ${key}: \${{ secrets.${key} }}`)
    .join('\n');

  // insert secrets declaration after workflow_call inputs
  // look for the pattern: inputs: ... (multiline) followed by blank line or permissions:
  result = result.replace(
    /(on:\n  workflow_call:\n    inputs:\n(?:      [^\n]+\n)+)/,
    `$1    secrets:\n${secretsDeclaration}\n\n`,
  );

  // insert env block to test-integration job
  // add env block after needs: [install] line
  result = result.replace(
    /(test-integration:\n    runs-on: ubuntu-24\.04\n    needs: \[install\]\n)/,
    `$1    env:\n${envBlock}\n`,
  );

  return result;
};

/**
 * .what = ensures .test.yml matches expected content with apikey secrets
 * .why = enables integration tests to access required api keys via github secrets
 */
export const check: FileCheckFunction = async (contents, context) => {
  // read apikeys from project
  const apikeysConfig = await readUseApikeysConfig({
    projectRootDirectory: context.getProjectRootDirectory(),
  });

  // build expected content from template + apikeys
  const expected = buildExpectedContent({
    template: context.declaredFileContents ?? '',
    apikeys: apikeysConfig?.apikeys?.required ?? [],
  });

  // if contents match expected, file passes (throw)
  if (contents === expected) {
    throw new Error('file matches expected content');
  }

  // return = file differs from expected (bad practice detected)
};

/**
 * .what = fixes .test.yml to include apikey secrets declaration and env vars
 * .why = ensures integration tests have access to required api keys
 */
export const fix: FileFixFunction = async (_contents, context) => {
  // read apikeys from project
  const apikeysConfig = await readUseApikeysConfig({
    projectRootDirectory: context.getProjectRootDirectory(),
  });

  // build expected content from template + apikeys
  const expected = buildExpectedContent({
    template: context.declaredFileContents ?? '',
    apikeys: apikeysConfig?.apikeys?.required ?? [],
  });

  return { contents: expected };
};
