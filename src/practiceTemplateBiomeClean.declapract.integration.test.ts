import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = clamps that every `.ts` template an adopter's biome formats is already biome-clean under
 *         the biome.jsonc the lint practice ships (#630)
 * .why  = a template that biome would reformat lands in the adopter's tree dirty, so its first
 *         `npm run test:format` fails on a file the adopter never touched, and its
 *         `npm run fix:format` rewrites the file, which the practice's EQUALS check then flags on
 *         the next apply. the two tools fight forever unless the template is clean to begin with.
 * .teeth = add a double space before any `=` in
 *          `config/best-practice/src/utils/config/getConfig.ts` and case1 goes red with that path.
 * .note = scope mirrors the shipped biome.jsonc `files.includes`: `.ts` under `src/`, `provision/`,
 *         and `blackbox/`, never under a `.test*` dir. each template is copied to a temp tree at its
 *         adopter path, under its practice, so one biome run checks them all with the shipped config.
 * .note = a template that holds a `@declapract{...}` expression is skipped: its line widths are
 *         set by the adopter's own values, so only the hydrated file has a biome-clean form.
 */

const practicesDir = join(__dirname, 'practices');
const shippedBiomeConfig = join(practicesDir, 'lint/best-practice/biome.jsonc');
const biomeBin = join(__dirname, '../node_modules/.bin/biome');

/**
 * .what = every `.ts` template the shipped biome config would format in an adopter's tree
 */
const getAllFormattedTemplates = (): { practice: string; path: string }[] =>
  readdirSync(practicesDir)
    .sort()
    .map((practice) => ({
      practice,
      dir: join(practicesDir, practice, 'best-practice'),
    }))
    .filter(({ dir }) => existsSync(dir))
    .flatMap(({ practice, dir }) =>
      getAllPathsUnderDir({ dir, skip: PRACTICE_TREE_SKIP_DIRS })
        .map((path) => relative(dir, path))
        .filter((path) => /^(src|provision|blackbox)\/.*\.ts$/.test(path))
        .filter((path) => !/\.declapract\.(integration\.)?test\.ts$/.test(path))
        .filter((path) => !path.endsWith('.declapract.ts'))
        .filter((path) => !path.includes('*'))
        .filter((path) => !/(^|\/)\.test/.test(path))
        .filter(
          (path) =>
            !readFileSync(join(dir, path), 'utf8').includes('@declapract{'),
        )
        .map((path) => ({ practice, path })),
    );

/**
 * .what = runs biome over the temp tree and returns the paths it would change
 */
const getAllDirtyPaths = (input: { root: string }): string[] => {
  try {
    execFileSync(
      biomeBin,
      [
        'check',
        '--linter-enabled=false',
        '--vcs-enabled=false',
        `--config-path=${join(input.root, 'biome.jsonc')}`,
        '--max-diagnostics=none',
        input.root,
      ],
      { cwd: input.root, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return [];
  } catch (error) {
    // allowlist only the child-process exit; jest's vm realm defeats an `instanceof Error` test
    if (typeof error !== 'object' || error === null || !('stderr' in error))
      throw error;
    const output = `${String(error.stderr)}\n${'stdout' in error ? String(error.stdout) : ''}`;
    const paths = [
      ...output.matchAll(/^(\S+\.ts)(?::\d+:\d+)? (format|assist)/gm),
    ].map((match) => relative(input.root, match[1]!));
    if (paths.length === 0) throw error;
    return [...new Set(paths)].sort();
  }
};

describe('best-practice .ts templates are biome-clean under the shipped config (#630)', () => {
  const templates = getAllFormattedTemplates();

  given('[case0] the templates the shipped biome config formats', () => {
    then('at least one is found, so the clamp is not vacuous', () => {
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  given('[case1] every such template, copied to its adopter path', () => {
    const scene = useBeforeAll(async () => {
      const root = genTempDir({ slug: 'practice-template-biome-clean' });
      copyFileSync(shippedBiomeConfig, join(root, 'biome.jsonc'));
      templates.forEach(({ practice, path }) => {
        const target = join(root, practice, path);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(join(practicesDir, practice, 'best-practice', path), target);
      });
      return { root };
    });

    when('[t0] biome checks the format and the import order', () => {
      then('no template would change', () => {
        expect(getAllDirtyPaths({ root: scene.root })).toEqual([]);
      });
    });
  });
});
