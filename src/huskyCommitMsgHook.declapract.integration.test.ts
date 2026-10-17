import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';
import yaml from 'yaml';

import { getAllPracticesForUsecase } from './utils/getAllPracticesForUsecase';

/**
 * .what = clamps the commit-message hook across every usecase: the `husky` practice ships
 *         `.husky/commit-msg` + `.husky/check.commit.sh`, and every usecase that holds `husky`
 *         resolves at least one practice that ships both.
 * .why  = the commit-msg hook is a hard requirement — it is the one gate that holds every commit
 *         to the conventional-commits shape the changelog and release version are derived from.
 *         a dedupe that drops it from one practice without a home in another ships a repo whose
 *         commits are never linted, and no apply reports the loss.
 * .teeth = delete either file from `husky/best-practice/.husky/`, or unwire `check.commit.sh` from
 *          `commit-msg`, and this reddens with the usecase named.
 */

const repoRoot = join(__dirname, '..');
const practicesDir = join(repoRoot, 'src/practices');
const usecasesYmlPath = join(repoRoot, 'src/useCases.yml');
const HOOK_FILES = ['.husky/commit-msg', '.husky/check.commit.sh'] as const;

/**
 * .what = the hook files a practice ships from its best-practice dir
 */
const getHookFilesShipped = (input: { practice: string }): string[] =>
  HOOK_FILES.filter((file) =>
    existsSync(join(practicesDir, input.practice, 'best-practice', file)),
  );

describe('huskyCommitMsgHook', () => {
  const usecases = Object.keys(
    yaml.parse(readFileSync(usecasesYmlPath, 'utf8'))['use-cases'],
  );
  const usecasesWithHusky = usecases.filter((usecase) =>
    getAllPracticesForUsecase({ usecasesYmlPath, usecase }).includes('husky'),
  );

  given('[case0] the husky practice, the owner of every .husky/ hook', () => {
    then('it ships commit-msg and check.commit.sh', () => {
      expect(getHookFilesShipped({ practice: 'husky' })).toEqual([...HOOK_FILES]);
    });

    then('commit-msg runs check.commit.sh, which runs commitlint on the message', () => {
      const hookDir = join(practicesDir, 'husky/best-practice/.husky');
      const commitMsg = readFileSync(join(hookDir, 'commit-msg'), 'utf8');
      const checkCommit = readFileSync(join(hookDir, 'check.commit.sh'), 'utf8');
      expect(commitMsg).toContain('/check.commit.sh"');
      expect(checkCommit).toContain('commitlint --edit "$1"');
    });
  });

  given('[case1] each usecase that holds husky', () => {
    then('at least the core usecase holds it', () => {
      expect(usecasesWithHusky).toContain('typescript-project-core');
    });

    when('[t0] its resolved practices are read', () => {
      then('some practice ships both commit hook files', () => {
        const offenses = usecasesWithHusky.flatMap((usecase) => {
          const shipped = getAllPracticesForUsecase({ usecasesYmlPath, usecase })
            .flatMap((practice) => getHookFilesShipped({ practice }));
          return HOOK_FILES.filter((file) => !shipped.includes(file)).map(
            (file) => `${usecase}: no practice ships ${file}`,
          );
        });
        expect(offenses).toEqual([]);
      });
    });
  });
});
