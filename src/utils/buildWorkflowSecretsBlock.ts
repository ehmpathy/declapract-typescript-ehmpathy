import { readUseApikeysConfig } from './readUseApikeysConfig';

/**
 * .what = builds workflow content with apikey secrets block for .test.yml
 * .why = single source of truth for test.yml, publish.yml, deploy.yml check+fix
 */
export const buildWorkflowSecretsBlock = async (
  input: { template: string },
  context: { getProjectRootDirectory: () => string },
): Promise<string> => {
  // read apikeys from project
  const apikeysConfig = await readUseApikeysConfig({
    projectRootDirectory: context.getProjectRootDirectory(),
  });
  const apikeys = apikeysConfig?.apikeys?.required ?? [];

  // if no apikeys, return template as-is
  if (!apikeys.length) {
    return input.template;
  }

  // build secrets block
  const secretsBlock = apikeys
    .map((key) => `      ${key}: \${{ secrets.${key} }}`)
    .join('\n');

  // find jobs that call .test.yml with 'with:' block and add secrets block after
  // handle cases with optional 'if:' before 'with:'
  const result = input.template.replace(
    /(uses: \.\/\.github\/workflows\/\.test\.yml\n(?:    if: [^\n]+\n)?    with:\n(?:      [^\n]+\n)+)/g,
    `$1    secrets:\n${secretsBlock}\n`,
  );

  return result;
};
