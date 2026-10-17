import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { given, then, when } from 'test-fns';
import yaml from 'yaml';

import { getAllPathsUnderDir } from './utils/getAllPathsUnderDir';
import { getAllPracticesForUsecase } from './utils/getAllPracticesForUsecase';

/**
 * .what = clamps that, in every usecase, each declared file path has ONE owner practice — unless
 *         the path is on the allowlist of files built to be shared (#630, #541).
 * .why  = declapract applies fixes in practice-name order. two practices that declare one file in
 *         one usecase, with shapes that disagree, form a 2-cycle: the later practice wins each
 *         apply, forever, so the second apply never converges. a declaration that can only fail
 *         (an EXISTS claim on a path another practice moves away) makes core mark the whole file
 *         manual, so a shipped fix is never applied (#607).
 * .teeth = declare `src/utils/config/config.schema.ts` in `config` again (persist-with-rds owns
 *          it) and case1 goes red with the path and both practices named.
 * .note = scope mirrors declapract's own read of a best-practice dir: every file is a declaration
 *         except the root `.declapract.*` meta files and the `*.declapract.test.ts(.snap)` files
 *         `declapract compile` strips. a glob declaration is compared by its literal path; overlap
 *         between a glob and a literal path is out of scope for this clamp.
 */

const repoRoot = join(__dirname, '..');
const practicesDir = join(repoRoot, 'src/practices');
const usecasesYmlPath = join(repoRoot, 'src/useCases.yml');

/**
 * .what = the paths that more than one practice may declare by design, each with its reason
 */
const SHARED_BY_DESIGN: Record<string, string> = {
  'package.json':
    'each practice declares a CONTAINS json subset; the json fix merges keys, so declarers compose',
  '.gitignore':
    'each declarer unions its own lines through defineExpectedGitignoreContents (#541)',
  'tsconfig.json':
    'node-package and typescript-node each declare a CONTAINS json subset; the json fix merges keys',
  'config/prep.json':
    'config and persist-with-rds each declare a CONTAINS json subset; the json fix merges keys',
  'config/prod.json':
    'config and persist-with-rds each declare a CONTAINS json subset; the json fix merges keys',
  'config/test.json':
    'config and persist-with-rds each declare a CONTAINS json subset; the json fix merges keys',
  'src/utils/config/config.schema.ts':
    'config declares a findsert (writes its base only where absent, passes any present file); persist-with-rds owns the content',
  'src/**/*.test.ts':
    'tests-any and tests-service each declare a presence check over the glob; neither writes a file',
  'src/**/*.integration.test.ts':
    'tests-any and tests-service each declare a presence check over the glob; neither writes a file',
};

/**
 * .what = every declared file path in one practice's best-practice dir
 */
const getAllDeclaredPaths = (input: { practice: string }): string[] => {
  const dir = join(practicesDir, input.practice, 'best-practice');
  if (!existsSync(dir)) return [];
  const declared = getAllPathsUnderDir({ dir, skip: ['node_modules'] })
    .map((path) => relative(dir, path))
    .filter((path) => !/^\.declapract\./.test(path))
    .filter(
      (path) => !/\.declapract\.(integration\.)?test\.ts(\.snap)?$/.test(path),
    )
    .map((path) => path.replace(/\.declapract\.ts$/, ''));
  return [...new Set(declared)];
};

/**
 * .what = every path that two or more practices declare in one usecase, with its declarers
 */
const getAllMultiDeclaredPaths = (input: {
  usecase: string;
}): { path: string; practices: string[] }[] => {
  const practices = getAllPracticesForUsecase({
    usecasesYmlPath,
    usecase: input.usecase,
  });
  const declarersByPath = practices
    .flatMap((practice) =>
      getAllDeclaredPaths({ practice }).map((path) => ({ path, practice })),
    )
    .reduce<Record<string, string[]>>(
      (acc, { path, practice }) => ({
        ...acc,
        [path]: [...(acc[path] ?? []), practice],
      }),
      {},
    );
  return Object.entries(declarersByPath)
    .filter(([, declarers]) => declarers.length > 1)
    .map(([path, declarers]) => ({ path, practices: declarers.sort() }));
};

describe('every file in a usecase has one owner practice (#630)', () => {
  const usecases = Object.keys(
    yaml.parse(readFileSync(usecasesYmlPath, 'utf8'))['use-cases'],
  ).sort();

  given('[case0] the usecases in src/useCases.yml', () => {
    then('at least one usecase is found, so the clamp is not vacuous', () => {
      expect(usecases.length).toBeGreaterThan(0);
    });

    then('the shared-by-design paths are declared by 2+ practices somewhere', () => {
      const multiDeclared = usecases.flatMap((usecase) =>
        getAllMultiDeclaredPaths({ usecase }).map(({ path }) => path),
      );
      Object.keys(SHARED_BY_DESIGN).forEach((path) =>
        expect(multiDeclared).toContain(path),
      );
    });
  });

  given('[case1] every usecase', () => {
    when('[t0] each declared path is grouped by its declarers', () => {
      then('no path outside the allowlist has two declarers', () => {
        const offenders = [
          ...new Set(
            usecases.flatMap((usecase) =>
              getAllMultiDeclaredPaths({ usecase })
                .filter(({ path }) => !(path in SHARED_BY_DESIGN))
                .map(
                  ({ path, practices }) =>
                    `${path} ← ${practices.join(' + ')}`,
                ),
            ),
          ),
        ].sort();
        expect(offenders).toEqual([]);
      });
    });
  });

  given('[case2] every practice that declares .gitignore (#541)', () => {
    const declarers = readdirSync(practicesDir)
      .filter((practice) =>
        getAllDeclaredPaths({ practice }).includes('.gitignore'),
      )
      .sort();

    then('two or more practices declare it, so the clamp is not vacuous', () => {
      expect(declarers.length).toBeGreaterThan(1);
    });

    then('each declares it through defineExpectedGitignoreContents', () => {
      const offenders = declarers.filter((practice) => {
        const declaration = join(
          practicesDir,
          practice,
          'best-practice/.gitignore.declapract.ts',
        );
        if (!existsSync(declaration)) return true;
        const source = readFileSync(declaration, 'utf8');
        return !/import \{ defineExpectedGitignoreContents \} from '[./]+\/utils\/defineExpectedGitignoreContents'/.test(
          source,
        );
      });
      expect(offenders).toEqual([]);
    });
  });
});
