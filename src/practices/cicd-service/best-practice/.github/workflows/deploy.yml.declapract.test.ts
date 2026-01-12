import fs from 'fs';
import path from 'path';

import { given, then, when } from 'test-fns';

import { withApikeysContext } from '../../../../../.test/infra/withApikeysContext';
import { buildWorkflowSecretsBlock } from '../../../../../utils/buildWorkflowSecretsBlock';

const template = fs.readFileSync(path.join(__dirname, 'deploy.yml'), 'utf-8');

describe('deploy.yml.declapract buildWorkflowSecretsBlock', () => {
  given('the actual deploy.yml template', () => {
    when('no apikeys are required', () => {
      then('it should return template unchanged', async () => {
        await withApikeysContext({ apikeys: [] }, async (context) => {
          const result = await buildWorkflowSecretsBlock({ template }, context);
          expect(result).toEqual(template);
        });
      });
    });

    when('one apikey is required', () => {
      then('it should add secrets block after with block', async () => {
        await withApikeysContext(
          { apikeys: ['ANTHROPIC_API_KEY'] },
          async (context) => {
            const result = await buildWorkflowSecretsBlock(
              { template },
              context,
            );
            expect(result).toContain('secrets:');
            expect(result).toContain(
              'ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}',
            );
          },
        );
      });

      then('it should match expected snapshot', async () => {
        await withApikeysContext(
          { apikeys: ['ANTHROPIC_API_KEY'] },
          async (context) => {
            const result = await buildWorkflowSecretsBlock(
              { template },
              context,
            );
            expect(result).toMatchSnapshot();
          },
        );
      });
    });

    when('multiple apikeys are required', () => {
      then('it should add all secrets to secrets block', async () => {
        await withApikeysContext(
          { apikeys: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'] },
          async (context) => {
            const result = await buildWorkflowSecretsBlock(
              { template },
              context,
            );
            expect(result).toContain(
              'ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}',
            );
            expect(result).toContain(
              'OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}',
            );
          },
        );
      });
    });
  });
});
