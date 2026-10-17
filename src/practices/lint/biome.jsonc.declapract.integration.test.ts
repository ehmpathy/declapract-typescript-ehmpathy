import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = clamps #649 + #666: the shipped biome.jsonc fails lint on a focused test, lints the
 *         `blackbox/` tree, and bans an import of the retired lambda caller.
 * .why  = biome's recommended set holds `noFocusedTests` at warn, so a stray `.only` merged clean
 *         and silently skipped its siblings (#649). and `files.includes` named only `src/` and
 *         `provision/`, so no rule reached the acceptance suite under `blackbox/` — a ban on
 *         `simple-lambda-testing-methods` there would have caught naught (#666).
 * .teeth = each case runs the REAL biome binary over a fixture repo that holds the shipped
 *          template. drop `noFocusedTests: error`, the `**\/blackbox/**\/*.ts` include, or the
 *          `noRestrictedImports` path, and the matched case goes green where it must go red.
 * .note = this file sits at the practice ROOT, so declapract never emits it.
 */

// the biome binary this repo pins; the fixture lints with the same version adopters run
const BIOME_BIN = join(process.cwd(), 'node_modules/.bin/biome');

/**
 * .what = run `biome lint` over the fixture with the shipped template as its config
 * .why  = the vcs block needs a git root, which a temp dir lacks; the flag turns it off so the
 *         run reads the config's `files.includes` alone
 */
const runBiomeLint = (input: { cwd: string }) => {
  const result = spawnSync(
    BIOME_BIN,
    ['lint', '--vcs-enabled=false', '--max-diagnostics=50', '.'],
    { cwd: input.cwd, encoding: 'utf8' },
  );
  return {
    status: result.status,
    output: `${result.stdout}\n${result.stderr}`,
  };
};

/**
 * .what = write a fixture repo: the shipped biome.jsonc plus one source file
 * .why  = each case owns its own dir, so no case's file can leak into another's lint run
 */
const genFixtureRepo = (input: {
  root: string;
  slug: string;
  file: { path: string; lines: string[] };
}): string => {
  const dir = join(input.root, input.slug);
  const filePath = join(dir, input.file.path);
  mkdirSync(join(filePath, '..'), { recursive: true });
  copyFileSync(
    join(__dirname, 'best-practice/biome.jsonc'),
    join(dir, 'biome.jsonc'),
  );
  writeFileSync(filePath, input.file.lines.join('\n'));
  return dir;
};

describe('lint biome.jsonc', () => {
  given('[case1] a repo with the shipped biome.jsonc', () => {
    const tempDir = genTempDir({ slug: 'lint-biome-jsonc' });

    when('[t0] a src test holds an it.only', () => {
      const result = useBeforeAll(async () =>
        runBiomeLint({
          cwd: genFixtureRepo({
            root: tempDir,
            slug: 't0',
            file: {
              path: 'src/getSurfReport.test.ts',
              lines: [
                "describe('getSurfReport', () => {",
                "  it.only('reads the swell', () => {",
                '    expect(1).toEqual(1);',
                '  });',
                '});',
                '',
              ],
            },
          }),
        }),
      );

      then('lint fails at lint/suspicious/noFocusedTests', () => {
        expect(result.output).toContain('lint/suspicious/noFocusedTests');
        expect(result.status).not.toEqual(0);
      });
    });

    when('[t1] a blackbox test imports simple-lambda-testing-methods', () => {
      const result = useBeforeAll(async () =>
        runBiomeLint({
          cwd: genFixtureRepo({
            root: tempDir,
            slug: 't1',
            file: {
              path: 'blackbox/lambdas/getSurfReport.acceptance.test.ts',
              lines: [
                "import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';",
                '',
                'export const invoke = invokeLambdaForTesting;',
                '',
              ],
            },
          }),
        }),
      );

      then('lint reaches blackbox/ and fails at noRestrictedImports', () => {
        expect(result.output).toContain('lint/style/noRestrictedImports');
        expect(result.output).toContain(
          'blackbox/lambdas/getSurfReport.acceptance.test.ts',
        );
        expect(result.status).not.toEqual(0);
      });

      then('the message names the replacement', () => {
        expect(result.output).toContain('runLambdaEndpoint');
      });
    });

    when('[t2] a blackbox test imports from sdk-aws-lambda', () => {
      const result = useBeforeAll(async () =>
        runBiomeLint({
          cwd: genFixtureRepo({
            root: tempDir,
            slug: 't2',
            file: {
              path: 'blackbox/lambdas/getSurfReport.acceptance.test.ts',
              lines: [
                "import { runLambdaEndpoint } from 'sdk-aws-lambda';",
                '',
                'export const run = runLambdaEndpoint;',
                '',
              ],
            },
          }),
        }),
      );

      then('lint passes', () => {
        expect(result.output).not.toContain('noRestrictedImports');
        expect(result.status).toEqual(0);
      });
    });
  });
});
