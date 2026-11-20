import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

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

      // the chain the fresh-checkout clamp runs is this repo's own copy, so each copy must be the shipped one
      ['check.yalc.sh', 'check.lockfile.sh', 'pre-commit', 'commit-msg'].map((hook) =>
        then(`${hook} equals the template`, () => {
          expect(read(path.join(repoRoot, '.husky', hook))).toEqual(read(path.join(templateDir, hook)));
        }),
      );

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

  given('[case2] the shipped commit-msg hook, run as git runs it', () => {
    /**
     * .what = a temp checkout that holds the shipped commit-msg + check.commit.sh, a commitlint
     *         stand-in that echoes its args and exits as told, and husky's runner only if asked
     * .why  = proves the hook lints the message where `husky install` never ran (a fresh worktree),
     *         and still sources husky's runner where it did
     */
    const runCommitMsg = (input: { huskyInstalled: boolean; lintExit: number }) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'husky-commit-msg-'));
      fs.mkdirSync(path.join(dir, '.husky/_'), { recursive: true });
      fs.copyFileSync(path.join(templateDir, 'commit-msg'), path.join(dir, '.husky/commit-msg'));
      fs.copyFileSync(path.join(templateDir, 'check.commit.sh'), path.join(dir, '.husky/check.commit.sh'));
      if (input.huskyInstalled) fs.writeFileSync(path.join(dir, '.husky/_/husky.sh'), 'echo "husky runner sourced"\n');
      fs.mkdirSync(path.join(dir, 'node_modules/.bin'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'node_modules/.bin/commitlint'),
        `#!/bin/sh\necho "commitlint $*"\nexit ${input.lintExit}\n`,
      );
      fs.chmodSync(path.join(dir, 'node_modules/.bin/commitlint'), 0o755);
      fs.writeFileSync(path.join(dir, 'COMMIT_EDITMSG'), 'fix(surf): wax the board\n');
      return spawnSync('sh', ['.husky/commit-msg', 'COMMIT_EDITMSG'], { cwd: dir, encoding: 'utf-8' });
    };

    when('[t0] husky install never ran in this checkout', () => {
      const result = useBeforeAll(async () => runCommitMsg({ huskyInstalled: false, lintExit: 0 }));

      then('it still lints the message, and skips the absent runner without a fault', () => {
        expect(result.stdout).toEqual('commitlint --edit COMMIT_EDITMSG\n');
        expect(result.stderr).toEqual('');
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] husky install ran', () => {
      const result = useBeforeAll(async () => runCommitMsg({ huskyInstalled: true, lintExit: 0 }));

      then("it sources husky's runner first, then lints the message", () => {
        expect(result.stdout).toEqual('husky runner sourced\ncommitlint --edit COMMIT_EDITMSG\n');
        expect(result.status).toEqual(0);
      });
    });

    when('[t2] commitlint rejects the message', () => {
      const result = useBeforeAll(async () => runCommitMsg({ huskyInstalled: false, lintExit: 1 }));

      then('the hook exits non-zero, so git refuses the commit', () => {
        expect(result.status).toEqual(1);
      });
    });
  });
});
