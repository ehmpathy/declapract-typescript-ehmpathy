import fs from 'node:fs';
import path from 'node:path';

import { given, then, when } from 'test-fns';

import { withKeyrackContext } from '../../../../../.test/infra/withKeyrackContext';
import { buildWorkflowSecretsBlock } from '../../../../../utils/buildWorkflowSecretsBlock';

const template = fs.readFileSync(path.join(__dirname, 'publish.yml'), 'utf-8');

describe('publish.yml.declapract buildWorkflowSecretsBlock', () => {
  given('the actual publish.yml template', () => {
    when('no apikeys are required', () => {
      then('it should return template unchanged', async () => {
        await withKeyrackContext({ keys: [] }, async (context) => {
          const result = await buildWorkflowSecretsBlock({ template }, context);
          expect(result).toEqual(template);
        });
      });
    });

    when('one apikey is required', () => {
      then('it should add secrets block after with block', async () => {
        await withKeyrackContext(
          { keys: ['ANTHROPIC_API_KEY'] },
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
        await withKeyrackContext(
          { keys: ['ANTHROPIC_API_KEY'] },
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
        await withKeyrackContext(
          { keys: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'] },
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
