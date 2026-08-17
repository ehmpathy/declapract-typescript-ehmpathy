import { FileCheckType } from 'declapract';
import { given, then, when } from 'test-fns';

import { check, fix } from './jest.*.js.declapract';

describe('javascript-config-files jest.*.js', () => {
  given('a stale .js jest config file', () => {
    when('the bad-practice check runs', () => {
      then('it is an EXISTS check (any .js jest config is detected)', () => {
        expect(check).toEqual(FileCheckType.EXISTS);
      });
    });

    when('the fix runs', () => {
      then('it deletes the file (contents null)', async () => {
        const result = await fix('module.exports = { preset: "jsdom" };', {} as any);
        expect(result.contents).toBeNull();
      });

      then('the delete is idempotent — a null input still yields null', async () => {
        const result = await fix(null, {} as any);
        expect(result.contents).toBeNull();
      });
    });
  });
});
