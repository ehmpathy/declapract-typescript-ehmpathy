import type { FileCheckContext } from 'declapract';
import { given, then, when } from 'test-fns';

import { fix } from './use.apikeys.json.declapract';

describe('cicd-common use.apikeys.json', () => {
  given('a project without use.apikeys.json', () => {
    when('fix is called with null contents', () => {
      then('it should create default structure', async () => {
        const result = await fix(null, {} as FileCheckContext);

        expect(result.contents).toBeDefined();
        const parsed = JSON.parse(result.contents!);
        expect(parsed).toEqual({
          apikeys: {
            required: [],
          },
        });
      });
    });
  });

  given('a project with existing use.apikeys.json', () => {
    when('fix is called with existing contents', () => {
      then('it should preserve the existing content', async () => {
        const existingContent = JSON.stringify(
          {
            apikeys: {
              required: ['ANTHROPIC_API_KEY'],
            },
          },
          null,
          2,
        );

        const result = await fix(existingContent, {} as FileCheckContext);

        expect(result.contents).toEqual(existingContent);
      });
    });
  });
});
