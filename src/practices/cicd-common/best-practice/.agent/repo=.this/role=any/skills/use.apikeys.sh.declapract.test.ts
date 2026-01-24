import type { FileCheckContext } from 'declapract';
import { given, then, when } from 'test-fns';

import { fix } from './use.apikeys.sh.declapract';

describe('cicd-common use.apikeys.sh', () => {
  given('a project with outdated use.apikeys.sh', () => {
    when('fix is called', () => {
      then('it should return the expected content from the pattern file', async () => {
        const result = await fix('outdated content', {} as FileCheckContext);

        expect(result.contents).toBeDefined();
        expect(result.contents).toContain('#!/bin/sh');
        expect(result.contents).toContain('.what = export api keys');
        expect(result.contents).toContain('apikeys.env');
      });
    });
  });

  given('a project without use.apikeys.sh', () => {
    when('fix is called with null contents', () => {
      then('it should return the expected content from the pattern file', async () => {
        const result = await fix(null, {} as FileCheckContext);

        expect(result.contents).toBeDefined();
        expect(result.contents).toContain('#!/bin/sh');
        expect(result.contents).toContain('.what = export api keys');
      });
    });
  });
});
