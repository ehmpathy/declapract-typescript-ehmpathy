import fs from 'node:fs';
import path from 'node:path';
import { genTempDir, given, then } from 'test-fns';

import { getFileTextOrNull } from './getFileTextOrNull';

describe('getFileTextOrNull', () => {
  given('[case1] a root that holds the file', () => {
    const root = genTempDir({ slug: 'get-file-text-or-null-found' });
    fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');

    then('it returns the text of the file', () => {
      expect(
        getFileTextOrNull({ root, relativePath: 'pnpm-lock.yaml' }),
      ).toEqual('lockfileVersion: 9.0\n');
    });
  });

  given('[case2] a root that lacks the file', () => {
    const root = genTempDir({ slug: 'get-file-text-or-null-absent' });

    then('it returns null', () => {
      expect(
        getFileTextOrNull({ root, relativePath: 'pnpm-lock.yaml' }),
      ).toBeNull();
    });
  });
});
