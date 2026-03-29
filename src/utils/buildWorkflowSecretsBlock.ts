import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { keyrack, type KeyrackGrantAttempt } from 'rhachet/keyrack';

/**
 * .what = builds workflow content with keyrack secrets block for .test.yml
 * .why = single source of truth for test.yml, publish.yml, deploy.yml check+fix
 */
export const buildWorkflowSecretsBlock = async (
  input: { template: string },
  context: { getProjectRootDirectory: () => string },
): Promise<string> => {
  // check if keyrack.yml exists
  const keyrackYmlPath = join(
    context.getProjectRootDirectory(),
    '.agent/keyrack.yml',
  );
  if (!existsSync(keyrackYmlPath)) return input.template;

  // get required keys from keyrack sdk
  const keys = (await keyrack.get({
    for: { repo: true },
    env: 'test',
  })) as KeyrackGrantAttempt[];
  if (!keys.length) return input.template;

  // extract key names from slugs (format: org.env.KEY_NAME)
  // .note = KeyrackGrantAttempt is a union of 4 variants (granted/absent/locked/blocked)
  //         per rhachet/dist/domain.objects/keyrack/KeyrackGrantAttempt.d.ts:8
  //         granted has slug at grant.slug; others have slug at top level
  const keyrackVars = keys.map((k) =>
    (k.status === 'granted' ? k.grant.slug : k.slug).split('.').pop()!,
  );

  // build secrets block
  const secretsBlock = keyrackVars
    .map((key) => `      ${key}: \${{ secrets.${key} }}`)
    .join('\n');

  // find jobs that call .test.yml with 'with:' block and add secrets block after
  return input.template.replace(
    /(uses: \.\/\.github\/workflows\/\.test\.yml\n(?:    if: [^\n]+\n)?    with:\n(?:      [^\n]+\n)+)/g,
    `$1    secrets:\n${secretsBlock}\n`,
  );
};
