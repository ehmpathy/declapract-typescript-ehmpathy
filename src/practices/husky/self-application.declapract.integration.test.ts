import fs from 'node:fs';
import path from 'node:path';

import { given, then, when } from 'test-fns';

import { contents as genLockContents } from './best-practice/.husky/check.timestamps.lock.sh.declapract';

/**
 * .what = this repo's own `.husky/` equals what the husky practice declares for its hook files
 * .why  = this repo ships the timestamp hook + its lock to every adopter; if its OWN copies drift
 *         from the templates, this repo commits under a weaker guard than it sells, and the lock
 *         here would pin a stale hook. the clamp makes self-application drift a red test
 */

// the repo root and the practice template dir
const repoRoot = path.join(__dirname, '../../..');
const templateDir = path.join(__dirname, 'best-practice/.husky');

// read a file as utf-8
const read = (filePath: string) => fs.readFileSync(filePath, 'utf-8');

describe('husky self-application', () => {
  given('[case1] this repo consumes its own husky practice', () => {
    when('[t0] its .husky hook files are compared to the declared contents', () => {
      then('check.timestamps.sh equals the template', () => {
        expect(read(path.join(repoRoot, '.husky/check.timestamps.sh'))).toEqual(
          read(path.join(templateDir, 'check.timestamps.sh')),
        );
      });

      then('check.secrets.sh equals the template', () => {
        expect(read(path.join(repoRoot, '.husky/check.secrets.sh'))).toEqual(
          read(path.join(templateDir, 'check.secrets.sh')),
        );
      });

      then('check.nvm.sh equals the template, and runs no `nvm use` a hook shell cannot load', () => {
        const template = read(path.join(templateDir, 'check.nvm.sh'));
        expect(read(path.join(repoRoot, '.husky/check.nvm.sh'))).toEqual(template);
        expect(template).not.toMatch(/^[^#\n]*\bnvm use\b/m);
      });

      then('check.timestamps.lock.sh equals the stamped declaration', async () => {
        const expected = await genLockContents(
          // the lock's contents fn reads no context
          undefined as never,
        );
        expect(read(path.join(repoRoot, '.husky/check.timestamps.lock.sh'))).toEqual(expected);
      });

      then('pre-commit runs the lock before the timestamp scan', () => {
        const preCommit = read(path.join(repoRoot, '.husky/pre-commit'));
        const lockAt = preCommit.indexOf('check.timestamps.lock.sh');
        const scanAt = preCommit.indexOf('/check.timestamps.sh');
        expect(lockAt).toBeGreaterThan(-1);
        expect(scanAt).toBeGreaterThan(lockAt);
      });
    });
  });
});
