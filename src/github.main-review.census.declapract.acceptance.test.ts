import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = the census journeys a human walks with no stub: help, bad input, and the real `gh` cli
 *         with no github credentials
 * .why  = the census is one of this repo's own skills, so its contract is proven here, as
 *         `repoSkills.declapract.acceptance.test.ts` proves the others. the verdict paths need
 *         canned github answers and stay in the play test (its `.mock` note says why); every
 *         journey that needs no answer from github runs here, against the real cli
 * .how  = run the skill by path, as rhx would, in a fresh git repo; for the no-credentials case,
 *         put the real `gh` on PATH with an empty `GH_CONFIG_DIR` and every github token removed
 * .where = the `src/` root, beside `repoSkills`: compile copies `src/practices/` into the shipped
 *         declarations, so a suite there would ship and run from a tree that holds no `.agent/`
 */

// the skill under test
const SKILL = path.join(
  __dirname,
  '../.agent/repo=.this/role=any/skills/github.main-review.census.sh',
);

// the env vars gh reads a token from
const GITHUB_TOKEN_VARS = [
  'GH_TOKEN',
  'GITHUB_TOKEN',
  'GH_ENTERPRISE_TOKEN',
  'GITHUB_ENTERPRISE_TOKEN',
];

/**
 * .what = the current env, with every github token var removed
 */
const asEnvWithoutGithubTokens = (input: { env: NodeJS.ProcessEnv }): NodeJS.ProcessEnv =>
  Object.fromEntries(
    Object.entries(input.env).filter(([name]) => !GITHUB_TOKEN_VARS.includes(name)),
  );

/**
 * .what = mask the cause line, whose text gh words one way at a terminal and another in actions
 */
const asStderrWithCauseMasked = (input: { stderr: string }): string =>
  input.stderr.replace(/├─ cause: [\s\S]*?\n(\s+└─ fix:)/, '├─ cause: [gh: no credentials]\n$1');

/**
 * .what = a fresh git repo, and a run of the census inside it
 */
const genCensusRepo = (input: { slug: string }) => {
  const tempDir = genTempDir({ slug: input.slug });
  const init = () => execFileSync('git', ['init', '-q'], { cwd: tempDir });
  const run = (args: string[], options: { env: NodeJS.ProcessEnv }) => {
    const res = spawnSync('bash', [SKILL, ...args], { cwd: tempDir, env: options.env });
    return { code: res.status, stdout: res.stdout.toString(), stderr: res.stderr.toString() };
  };
  return { tempDir, init, run };
};

describe('github.main-review.census', () => {
  given('[case1] a human who asks for help', () => {
    const repo = genCensusRepo({ slug: 'census-acceptance-help' });

    when('[t0] --help', () => {
      const result = useThen('it runs', async () => {
        repo.init();
        return repo.run(['--help'], { env: process.env });
      });

      then('it exits 0 and names the one flag, its default, and the exit codes', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain('--owners   space-separated orgs or users');
        expect(result.stdout).toContain("(default: 'ehmpathy ahbode whodisio uladkasach')");
        expect(result.stdout).toContain('exit 0 = census done, 1 = a github read failed, 2 = bad input');
      });
      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] a human who mistypes an arg', () => {
    const repo = genCensusRepo({ slug: 'census-acceptance-bad-input' });

    when('[t0] an unknown arg, then an empty --owners', () => {
      const result = useThen('each runs', async () => {
        repo.init();
        return {
          unknownArg: repo.run(['--nope'], { env: process.env }),
          ownersEmpty: repo.run(['--owners', ''], { env: process.env }),
        };
      });

      then('each exits 2 with a ConstraintError that names the fix, before any github call', () => {
        expect(result.unknownArg.code).toEqual(2);
        expect(result.unknownArg.stderr).toContain("✋ ConstraintError: unknown arg '--nope'");
        expect(result.ownersEmpty.code).toEqual(2);
        expect(result.ownersEmpty.stderr).toContain('✋ ConstraintError: --owners is empty');
      });
      then('each fix names the next move', () => {
        expect(result.unknownArg.stderr).toContain(
          'fix: see the flags via rhx github.main-review.census --help',
        );
        expect(result.ownersEmpty.stderr).toContain(
          "fix: name the owners, e.g. rhx github.main-review.census --owners 'ehmpathy ahbode'",
        );
      });
      then('stderr of the unknown arg matches snapshot', () => {
        expect(result.unknownArg.stderr).toMatchSnapshot();
      });
      then('stderr of the empty --owners matches snapshot', () => {
        expect(result.ownersEmpty.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] the real gh cli, with no github credentials', () => {
    const repo = genCensusRepo({ slug: 'census-acceptance-no-creds' });

    when('[t0] the census runs', () => {
      const result = useThen('it runs', async () => {
        // the real gh must be on PATH; without it this case proves naught
        const ghFound = spawnSync('gh', ['--version']).status === 0;
        if (!ghFound)
          throw new ConstraintError('this test needs the real gh cli on PATH', {
            hint: 'install gh (https://cli.github.com), then rerun',
          });

        // a gh config dir that holds no login, and an env with no token
        repo.init();
        const configDir = path.join(repo.tempDir, '.gh-config-empty');
        fs.mkdirSync(configDir, { recursive: true });
        return repo.run(['--owners', 'ehmpathy'], {
          env: { ...asEnvWithoutGithubTokens({ env: process.env }), GH_CONFIG_DIR: configDir },
        });
      });

      then('it exits 1 with a MalfunctionError and never a verdict', () => {
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain("💥 MalfunctionError: could not list repos for 'ehmpathy'");
        expect(result.stdout).not.toContain('census done');
        expect(result.stdout).not.toContain('verdicts');
      });

      then("the cause is gh's own no-credentials message, and the fix names the login", () => {
        expect(result.stderr).toMatch(/├─ cause: .*(gh auth login|GH_TOKEN)/);
        expect(result.stderr).toContain('fix: log gh in (gh auth login) or set GH_TOKEN, then rerun');
      });

      then('stderr, with the cause masked, matches snapshot', () => {
        expect(asStderrWithCauseMasked({ stderr: result.stderr })).toMatchSnapshot();
      });

      then('stdout, cut short before any owner line, matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
