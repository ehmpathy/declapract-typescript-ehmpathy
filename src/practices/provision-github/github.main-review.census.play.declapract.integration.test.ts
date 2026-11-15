import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = hermetic proof of `rhx github.main-review.census`: each verdict path, the tally, the
 *         table, --help, and every blocked or failed state, against a `gh` stub
 * .why  = the census output rides in a pr body as evidence; its verdicts, exit codes, and error
 *         text must not drift unseen. a stub keeps the suite off live github, its rate limit,
 *         and a token the test job does not hold
 * .how  = put a `gh` stub first on PATH, seed it with canned json per call, run the skill in a
 *         fresh git repo, and read stdout, stderr, exit code, the table, and the stub's call log
 */

// the skill under test, and the stub that stands in for gh
const SKILL = path.join(
  __dirname,
  '../../../.agent/repo=.this/role=any/skills/github.main-review.census.sh',
);
const GH_STUB = path.join(__dirname, '.test/assets/gh.stub.sh');

/**
 * .what = a sandbox: a git repo, a `gh` stub on PATH, and setters for the stub's fixtures
 */
const genCensusSandbox = (input: { slug: string }) => {
  const tempDir = genTempDir({ slug: input.slug });
  const stubDir = path.join(tempDir, '.gh-stub');
  const binDir = path.join(tempDir, '.bin');

  // prepare the repo, the stub dir, and `gh` on PATH
  const init = () => {
    execFileSync('git', ['init', '-q'], { cwd: tempDir });
    fs.mkdirSync(stubDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.copyFileSync(GH_STUB, path.join(binDir, 'gh'));
    fs.chmodSync(path.join(binDir, 'gh'), 0o755);
    fs.writeFileSync(path.join(stubDir, 'calls.log'), '');
  };

  // a fixture key, as the stub names it: each '/' becomes '__'
  const asKey = (key: string) => key.replace(/\//g, '__');
  const setJson = (key: string, json: unknown) =>
    fs.writeFileSync(path.join(stubDir, `${asKey(key)}.json`), JSON.stringify(json));
  const setErr = (key: string, stderr: string) =>
    fs.writeFileSync(path.join(stubDir, `${asKey(key)}.err`), `${stderr}\n`);

  // run the skill, as rhx would, with the stub first on PATH
  const run = (args: string[]) => {
    const res = spawnSync('bash', [SKILL, ...args], {
      cwd: tempDir,
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, GH_STUB_DIR: stubDir },
    });
    return { code: res.status, stdout: res.stdout.toString(), stderr: res.stderr.toString() };
  };

  const readTable = () =>
    fs.readFileSync(path.join(tempDir, '.log/github.main-review.census/census.md'), 'utf-8');
  const readCalls = () =>
    fs.readFileSync(path.join(stubDir, 'calls.log'), 'utf-8').trim().split('\n').filter(Boolean);
  const readScratchDirs = () =>
    fs
      .readdirSync(path.join(tempDir, '.log/github.main-review.census'))
      .filter((name) => name.startsWith('run.'));

  return { init, setJson, setErr, run, readTable, readCalls, readScratchDirs };
};

/**
 * .what = seed one repo: release flag, main protection, rulesets, prs, classic protection
 */
const seedRepo = (
  sandbox: ReturnType<typeof genCensusSandbox>,
  input: {
    slug: string;
    release: boolean;
    main: { protected: boolean } | null;
    rules: unknown[] | null;
    prs: { number: number; reviewDecision: string }[] | null;
    protection: unknown | null;
  },
) => {
  if (input.release)
    sandbox.setJson(`api/repos/${input.slug}/contents/.github/workflows/release.yml`, {
      name: 'release.yml',
    });
  if (input.main) sandbox.setJson(`api/repos/${input.slug}/branches/main`, input.main);
  if (input.rules) sandbox.setJson(`api/repos/${input.slug}/rules/branches/main`, input.rules);
  if (input.prs) sandbox.setJson(`pr/${input.slug}`, input.prs);
  if (input.protection)
    sandbox.setJson(`api/repos/${input.slug}/branches/main/protection`, input.protection);
};

// a repo list row, as `gh repo list --json` gives it
const asRepoRow = (input: {
  slug: string;
  archived: boolean;
  fork: boolean;
  perm: 'ADMIN' | 'WRITE';
}) => ({
  nameWithOwner: input.slug,
  isArchived: input.archived,
  isFork: input.fork,
  viewerPermission: input.perm,
});

describe('github.main-review.census', () => {
  given('[case1] a caller who asks for help', () => {
    const sandbox = genCensusSandbox({ slug: 'census-help' });

    when('[t0] --help', () => {
      const result = useThen('it runs', async () => {
        sandbox.init();
        return sandbox.run(['--help']);
      });

      then('it exits 0 and prints the header to its close rule, no code', () => {
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain(
          'verdict per repo: requires | lacks | unknown (no main branch | no decisive pr)',
        );
        expect(result.stdout.trim().split('\n').pop()).toMatch(/^#{20,}$/);
        expect(result.stdout).not.toContain('set -euo pipefail');
      });
      then('it matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] a caller with bad input', () => {
    const sandbox = genCensusSandbox({ slug: 'census-bad-input' });

    when('[t0] each bad input runs', () => {
      const results = useThen('they run', async () => {
        sandbox.init();
        return {
          unknownArg: sandbox.run(['--nope']),
          ownersBare: sandbox.run(['--owners']),
          ownersEmpty: sandbox.run(['--owners', '']),
        };
      });

      then('an unknown arg exits 2 with a ConstraintError that names the arg and --help', () => {
        expect(results.unknownArg.code).toEqual(2);
        expect(results.unknownArg.stderr).toContain("✋ ConstraintError: unknown arg '--nope'");
        expect(results.unknownArg.stderr).toContain('--help');
        expect(results.unknownArg.stderr).toMatchSnapshot();
      });
      then('--owners with no value exits 2 with a ConstraintError and an example', () => {
        expect(results.ownersBare.code).toEqual(2);
        expect(results.ownersBare.stderr).toContain('✋ ConstraintError: --owners needs a value');
        expect(results.ownersBare.stderr).toMatchSnapshot();
      });
      then('--owners empty exits 2 with a ConstraintError', () => {
        expect(results.ownersEmpty.code).toEqual(2);
        expect(results.ownersEmpty.stderr).toContain('✋ ConstraintError: --owners is empty');
      });
    });
  });

  given('[case3] an owner with one repo of each shape', () => {
    const sandbox = genCensusSandbox({ slug: 'census-each-shape' });

    when('[t0] the census runs', () => {
      const result = useThen('it completes', async () => {
        sandbox.init();
        sandbox.setJson('repo/acme', [
          asRepoRow({ slug: 'acme/archived', archived: true, fork: false, perm: 'WRITE' }),
          asRepoRow({ slug: 'acme/forked', archived: false, fork: true, perm: 'WRITE' }),
          asRepoRow({ slug: 'acme/no-main', archived: false, fork: false, perm: 'WRITE' }),
          asRepoRow({ slug: 'acme/bare', archived: false, fork: false, perm: 'WRITE' }),
          asRepoRow({ slug: 'acme/ruled', archived: false, fork: false, perm: 'WRITE' }),
          asRepoRow({ slug: 'acme/admin-gated', archived: false, fork: false, perm: 'ADMIN' }),
          asRepoRow({ slug: 'acme/admin-open', archived: false, fork: false, perm: 'ADMIN' }),
          asRepoRow({ slug: 'acme/push-gated', archived: false, fork: false, perm: 'WRITE' }),
          asRepoRow({ slug: 'acme/push-open', archived: false, fork: false, perm: 'WRITE' }),
          asRepoRow({ slug: 'acme/push-undecided', archived: false, fork: false, perm: 'WRITE' }),
        ]);
        seedRepo(sandbox, {
          slug: 'acme/no-main',
          release: false,
          main: null,
          rules: null,
          prs: null,
          protection: null,
        });
        seedRepo(sandbox, {
          slug: 'acme/bare',
          release: true,
          main: { protected: false },
          rules: null,
          prs: null,
          protection: null,
        });
        sandbox.setErr(
          'api/repos/acme/bare/rules/branches/main',
          'gh: Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)',
        );
        seedRepo(sandbox, {
          slug: 'acme/ruled',
          release: true,
          main: { protected: true },
          rules: [
            { type: 'deletion' },
            { type: 'pull_request', parameters: { required_approving_review_count: 2 } },
          ],
          prs: null,
          protection: null,
        });
        seedRepo(sandbox, {
          slug: 'acme/admin-gated',
          release: true,
          main: { protected: true },
          rules: [],
          prs: null,
          protection: { required_pull_request_reviews: { required_approving_review_count: 1 } },
        });
        seedRepo(sandbox, {
          slug: 'acme/admin-open',
          release: false,
          main: { protected: true },
          rules: [],
          prs: null,
          protection: { required_status_checks: { strict: true } },
        });
        seedRepo(sandbox, {
          slug: 'acme/push-gated',
          release: true,
          main: { protected: true },
          rules: [],
          prs: [
            { number: 14, reviewDecision: 'APPROVED' },
            { number: 12, reviewDecision: 'REVIEW_REQUIRED' },
          ],
          protection: null,
        });
        seedRepo(sandbox, {
          slug: 'acme/push-open',
          release: true,
          main: { protected: true },
          rules: [],
          prs: [
            { number: 9, reviewDecision: 'APPROVED' },
            { number: 7, reviewDecision: '' },
          ],
          protection: null,
        });
        seedRepo(sandbox, {
          slug: 'acme/push-undecided',
          release: false,
          main: { protected: true },
          rules: [],
          prs: [{ number: 3, reviewDecision: 'APPROVED' }],
          protection: null,
        });
        const run = sandbox.run(['--owners', 'acme']);
        return {
          ...run,
          table: sandbox.readTable(),
          calls: sandbox.readCalls(),
          scratch: sandbox.readScratchDirs(),
        };
      });

      then('it exits 0 with the tally', () => {
        expect(result.stderr).toEqual('');
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain('repos read: 8 (skipped 2 archived or fork)');
        expect(result.stdout).toContain('requires: 3');
        expect(result.stdout).toContain('lacks: 3 (2 with a release workflow)');
        expect(result.stdout).toContain('unknown: 2');
        expect(result.stdout).toContain('table: .log/github.main-review.census/census.md');
      });
      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
      then('each repo carries the verdict its signals decide', () => {
        expect(result.table).toContain('| acme/no-main | no | unknown | no main branch |');
        expect(result.table).toContain('| acme/bare | yes | lacks | main unprotected |');
        expect(result.table).toContain('| acme/ruled | yes | requires | ruleset: 2 approval(s) |');
        expect(result.table).toContain(
          '| acme/admin-gated | yes | requires | protection: 1 approval(s) |',
        );
        expect(result.table).toContain('| acme/admin-open | no | lacks | protection: 0 approvals |');
        expect(result.table).toContain(
          '| acme/push-gated | yes | requires | pr #12 reviewDecision=REVIEW_REQUIRED |',
        );
        expect(result.table).toContain(
          '| acme/push-open | yes | lacks | pr #7 reviewDecision=(empty) |',
        );
        expect(result.table).toContain(
          '| acme/push-undecided | no | unknown | protected; no decisive pr in the latest 10 |',
        );
      });
      then('archived repos and forks are not listed', () => {
        expect(result.table).not.toContain('acme/archived');
        expect(result.table).not.toContain('acme/forked');
      });
      then('the table matches snapshot', () => {
        expect(result.table).toMatchSnapshot();
      });
      then('every call to gh is a read: an api GET, a pr list, or a repo list', () => {
        expect(result.calls.length).toBeGreaterThan(0);
        const callsNotRead = result.calls.filter(
          (call) =>
            !call.startsWith('api --method GET ') &&
            !call.startsWith('pr list ') &&
            !call.startsWith('repo list '),
        );
        expect(callsNotRead).toEqual([]);
      });
      then('the run leaves no scratch dir behind', () => {
        expect(result.scratch).toEqual([]);
      });
    });
  });

  given('[case4] a github read that fails for a cause other than absence', () => {
    const sandbox = genCensusSandbox({ slug: 'census-failed-read' });

    when('[t0] the release workflow read returns a 500', () => {
      const result = useThen('the census runs', async () => {
        sandbox.init();
        sandbox.setJson('repo/acme', [
          asRepoRow({ slug: 'acme/flaky', archived: false, fork: false, perm: 'WRITE' }),
        ]);
        sandbox.setErr(
          'api/repos/acme/flaky/contents/.github/workflows/release.yml',
          'gh: Server Error (HTTP 500)',
        );
        return sandbox.run(['--owners', 'acme']);
      });

      then('it exits 1 with a MalfunctionError that names the repo, the read, and the cause', () => {
        expect(result.code).toEqual(1);
        expect(result.stderr).toContain(
          "💥 MalfunctionError: a github read failed, so the census cannot verdict 'acme/flaky'",
        );
        expect(result.stderr).toContain('read: release workflow');
        expect(result.stderr).toContain('cause: gh: Server Error (HTTP 500)');
        expect(result.stdout).not.toContain('census done');
      });
      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case5] an owner github does not know', () => {
    const sandbox = genCensusSandbox({ slug: 'census-unknown-owner' });

    when('[t0] the repo list fails on the owner', () => {
      const result = useThen('the census runs', async () => {
        sandbox.init();
        sandbox.setErr(
          'repo/ghost',
          "GraphQL: no User with the login of 'ghost'. (repositoryOwner)",
        );
        return sandbox.run(['--owners', 'ghost']);
      });

      then('it exits 2 with a ConstraintError that names the owner and the fix', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain("✋ ConstraintError: github knows no owner 'ghost'");
        expect(result.stderr).toContain('fix: check the owner name in --owners');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
