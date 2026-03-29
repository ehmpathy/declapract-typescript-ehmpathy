import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { keyrack, type KeyrackGrantAttempt } from 'rhachet/keyrack';

/**
 * .what = gets keyrack key names for test env from target project
 * .why = single source of truth for key discovery
 */
const getKeyrackKeys = async (projectRootDir: string): Promise<string[]> => {
  const keyrackYmlPath = join(projectRootDir, '.agent/keyrack.yml');
  if (!existsSync(keyrackYmlPath)) return [];

  const keys = (await keyrack.get({
    for: { repo: true },
    env: 'test',
  })) as KeyrackGrantAttempt[];
  if (!keys.length) return [];

  // extract key names from slugs (format: org.env.KEY_NAME)
  // .note = KeyrackGrantAttempt is a union of 4 variants (granted/absent/locked/blocked)
  //         per rhachet/dist/domain.objects/keyrack/KeyrackGrantAttempt.d.ts:8
  //         granted has slug at grant.slug; others have slug at top level
  return keys.map((k) =>
    (k.status === 'granted' ? k.grant.slug : k.slug).split('.').pop()!,
  );
};

/**
 * .what = builds the expected .test.yml content with keyrack secrets injected
 * .why = single source of truth for both check and fix
 */
export const buildExpectedContent = (input: {
  template: string;
  keys: string[];
}): string => {
  let result = input.template;

  // if no keys, return template as-is
  if (!input.keys.length) {
    return result;
  }

  // build secrets declaration block for workflow_call
  const secretsDeclaration = input.keys
    .map(
      (key) =>
        `      ${key}:\n        description: "api key for ${key.toLowerCase().replace(/_/g, ' ')}"\n        required: false`,
    )
    .join('\n');

  // build env block for test-integration job
  const envBlock = input.keys
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
 * .what = ensures .test.yml matches expected content with keyrack secrets
 * .why = enables integration tests to access required api keys via github secrets
 */
export const check: FileCheckFunction = async (contents, context) => {
  // get keyrack keys from project
  const keys = await getKeyrackKeys(context.getProjectRootDirectory());

  // build expected content from template + keys
  const expected = buildExpectedContent({
    template: context.declaredFileContents ?? '',
    keys,
  });

  // if contents don't match expected, best practice is violated
  if (contents !== expected) {
    throw new Error(
      'file does not match expected content with keyrack secrets',
    );
  }

  // return = file matches expected (best practice followed)
};

/**
 * .what = fixes .test.yml to include keyrack secrets declaration and env vars
 * .why = ensures integration tests have access to required api keys
 */
export const fix: FileFixFunction = async (_contents, context) => {
  // get keyrack keys from project
  const keys = await getKeyrackKeys(context.getProjectRootDirectory());

  // build expected content from template + keys
  const expected = buildExpectedContent({
    template: context.declaredFileContents ?? '',
    keys,
  });

  return { contents: expected };
};
