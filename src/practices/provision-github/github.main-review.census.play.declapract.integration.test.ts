import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = hermetic proof of `rhx github.main-review.census`: each verdict path, the tally, the
 *         table and rows, and every failed state, against a `gh` stub
 * .why  = the census output rides in a pr body as evidence; its verdicts, exit codes, and error
 *         text must not drift unseen. a stub keeps the suite off live github, its rate limit,
 *         and a token the test job does not hold
 * .how  = put a `gh` stub first on PATH, seed it with canned json per call, run the skill in a
 *         fresh git repo, and read stdout, stderr, exit code, the table, and the stub's call log
 * .mock = gh, the github cli (via `.test/assets/gh.stub.sh` on PATH)
 * .why  = the ci test job holds no github token, so a live read would go red there (fulcrum F14);
 *         the vision marks this exception (`rule.require.external-contract-integration-tests`)
 * .real = `src/github.main-review.census.declapract.acceptance.test.ts` runs the real gh, with no
 *         credentials, and proves the census fails loud; help and bad input are proven there too
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
    // the stub filters with the host jq, as gh filters with its own; without it, every read would fail
    const jqFound = spawnSync('jq', ['--version']).status === 0;
    if (!jqFound)
      throw new ConstraintError('the gh stub needs jq on PATH', {
        hint: 'install jq (apt install jq, brew install jq), then rerun',
      });
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
  const run = (args: string[], options?: { envExtra: Record<string, string> }) => {
    const res = spawnSync('bash', [SKILL, ...args], {
      cwd: tempDir,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        GH_STUB_DIR: stubDir,
        ...options?.envExtra,
      },
    });
    return { code: res.status, stdout: res.stdout.toString(), stderr: res.stderr.toString() };
  };

  const tablePath = path.join(tempDir, '.log/github.main-review.census/census.md');
  const readTable = () => fs.readFileSync(tablePath, 'utf-8');
  const isTableFound = () => fs.existsSync(tablePath);
  const readRows = () =>
    fs.readFileSync(path.join(tempDir, '.log/github.main-review.census/rows.tsv'), 'utf-8');
  const readCalls = () =>
    fs.readFileSync(path.join(stubDir, 'calls.log'), 'utf-8').trim().split('\n').filter(Boolean);
  const readScratchDirs = () =>
    fs
      .readdirSync(path.join(tempDir, '.log/github.main-review.census'))
      .filter((name) => name.startsWith('run.'));

  return {
    tempDir,
    init,
    setJson,
    setErr,
    run,
    readTable,
    isTableFound,
    readRows,
    readCalls,
    readScratchDirs,
  };
};
type CensusSandbox = ReturnType<typeof genCensusSandbox>;

/**
 * .what = seed one repo: release flag, main protection, rulesets, prs, classic protection
 */
const seedRepo = (
  sandbox: CensusSandbox,
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

// seed an owner with one unprotected repo that carries a release workflow
const seedOwnerWithOneOpenRepo = (sandbox: CensusSandbox, input: { owner: string }) => {
  sandbox.setJson(`repo/${input.owner}`, [
    asRepoRow({ slug: `${input.owner}/app`, archived: false, fork: false, perm: 'WRITE' }),
  ]);
  seedRepo(sandbox, {
    slug: `${input.owner}/app`,
    release: true,
    main: { protected: false },
    rules: [],
    prs: null,
    protection: null,
  });
};

/**
 * .what = the census's failure journeys, as data: a seed, the args, and the exit and stderr each owes
 * .why  = every failure shares one shape (seed, run, exit, error with its fix, no verdict, no
 *         partial table), so one runner keeps each case to the facts that differ
 */
const FAILURE_CASES: {
  given: string;
  slug: string;
  args: string[];
  seed: (sandbox: CensusSandbox) => void;
  expect: { code: 1 | 2; stderr: string[]; stderrLacks: string[] };
}[] = [
  {
    given: '[case5] a release workflow read that returns a 500',
    slug: 'census-failed-read',
    args: ['--owners', 'acme'],
    seed: (sandbox) => {
      sandbox.setJson('repo/acme', [
        asRepoRow({ slug: 'acme/flaky', archived: false, fork: false, perm: 'WRITE' }),
      ]);
      sandbox.setErr(
        'api/repos/acme/flaky/contents/.github/workflows/release.yml',
        'gh: Server Error (HTTP 500)',
      );
    },
    expect: {
      code: 1,
      stderr: [
        "💥 MalfunctionError: a github read failed, so the census cannot reach a verdict for 'acme/flaky'",
        'read: release workflow',
        'cause: gh: Server Error (HTTP 500)',
        'fix: retry once the network or github recovers',
      ],
      stderrLacks: [],
    },
  },
  {
    given: '[case6] a rulesets read that returns a 403 for a cause other than the plan',
    slug: 'census-other-403',
    args: ['--owners', 'acme'],
    seed: (sandbox) => {
      sandbox.setJson('repo/acme', [
        asRepoRow({ slug: 'acme/locked', archived: false, fork: false, perm: 'WRITE' }),
      ]);
      seedRepo(sandbox, {
        slug: 'acme/locked',
        release: false,
        main: { protected: true },
        rules: null,
        prs: null,
        protection: null,
      });
      sandbox.setErr(
        'api/repos/acme/locked/rules/branches/main',
        'gh: Resource not accessible by integration (HTTP 403)',
      );
    },
    expect: {
      code: 1,
      stderr: [
        "💥 MalfunctionError: a github read failed, so the census cannot reach a verdict for 'acme/locked'",
        'read: rulesets on main',
        'fix: check the token may read this repo (gh auth status shows its scopes), then rerun',
      ],
      stderrLacks: [],
    },
  },
  {
    given: '[case7] a recent prs read that fails mid-walk on a rate limit',
    slug: 'census-pr-list-failed',
    args: ['--owners', 'acme'],
    seed: (sandbox) => {
      sandbox.setJson('repo/acme', [
        asRepoRow({ slug: 'acme/push-busy', archived: false, fork: false, perm: 'WRITE' }),
      ]);
      seedRepo(sandbox, {
        slug: 'acme/push-busy',
        release: true,
        main: { protected: true },
        rules: [],
        prs: null,
        protection: null,
      });
      sandbox.setErr('pr/acme/push-busy', 'GraphQL: API rate limit exceeded for user ID 1.');
    },
    expect: {
      code: 1,
      stderr: [
        "💥 MalfunctionError: a github read failed, so the census cannot reach a verdict for 'acme/push-busy'",
        'read: recent prs into main',
        'cause: GraphQL: API rate limit exceeded',
        'fix: wait for the rate limit to reset (gh api rate_limit shows when), then rerun',
      ],
      stderrLacks: [],
    },
  },
  {
    given: '[case8] a repo list that returns a 500 for a known owner',
    slug: 'census-list-failed',
    args: ['--owners', 'acme'],
    seed: (sandbox) => {
      sandbox.setErr('repo/acme', 'gh: Server Error (HTTP 500)');
      sandbox.setJson('api/users/acme', { login: 'acme' });
    },
    expect: {
      code: 1,
      stderr: [
        "💥 MalfunctionError: could not list repos for 'acme'",
        'cause: gh: Server Error (HTTP 500)',
        'fix: retry once the network or github recovers',
      ],
      stderrLacks: [],
    },
  },
  {
    given: '[case9] a repo list refused for absent credentials',
    slug: 'census-no-auth',
    args: ['--owners', 'acme'],
    seed: (sandbox) => {
      sandbox.setErr('repo/acme', 'HTTP 401: Bad credentials (https://api.github.com/graphql)');
      sandbox.setErr(
        'api/users/acme',
        'HTTP 401: Bad credentials (https://api.github.com/users/acme)',
      );
    },
    expect: {
      code: 1,
      stderr: [
        "💥 MalfunctionError: could not list repos for 'acme'",
        'fix: log gh in (gh auth login) or set GH_TOKEN, then rerun',
      ],
      stderrLacks: ['retry once'],
    },
  },
  {
    given: '[case10] a repo list that comes back empty',
    slug: 'census-list-empty',
    args: ['--owners', 'hidden'],
    seed: (sandbox) => sandbox.setJson('repo/hidden', []),
    expect: {
      code: 1,
      stderr: ["💥 MalfunctionError: the repo list for 'hidden' came back empty", 'gh auth status'],
      stderrLacks: [],
    },
  },
  {
    given: '[case11] a repo list that reaches the cap',
    slug: 'census-list-cap',
    args: ['--owners', 'huge'],
    seed: (sandbox) =>
      sandbox.setJson(
        'repo/huge',
        Array.from({ length: 1000 }, (_, index) =>
          asRepoRow({ slug: `huge/repo-${index}`, archived: false, fork: false, perm: 'WRITE' }),
        ),
      ),
    expect: {
      code: 1,
      stderr: [
        "💥 MalfunctionError: the repo list for 'huge' reached the cap of 1000",
        'fix: raise REPO_LIST_CAP in .agent/repo=.this/role=any/skills/github.main-review.census.sh, then rerun',
      ],
      stderrLacks: [],
    },
  },
  {
    given: '[case12] an owner github does not know',
    slug: 'census-unknown-owner',
    args: ['--owners', 'ghost'],
    // gh's own text for an owner it does not know; the census tells it by users/<owner> 404
    seed: (sandbox) =>
      sandbox.setErr(
        'repo/ghost',
        'the owner handle "ghost" was not recognized as either a GitHub user or an organization',
      ),
    expect: {
      code: 2,
      stderr: [
        "✋ ConstraintError: github knows no owner 'ghost'",
        'fix: check the owner name in --owners',
      ],
      stderrLacks: [],
    },
  },
  {
    given: '[case13] owners given comma-separated',
    slug: 'census-comma-owners',
    args: ['--owners', 'ghost,ghoul'],
    seed: (sandbox) =>
      sandbox.setErr(
        'repo/ghost,ghoul',
        'the owner handle "ghost,ghoul" was not recognized as either a GitHub user or an organization',
      ),
    expect: {
      code: 2,
      stderr: [
        "✋ ConstraintError: github knows no owner 'ghost,ghoul'",
        "fix: --owners is space-separated, e.g. --owners 'ghost ghoul'",
      ],
      stderrLacks: [],
    },
  },
];

describe('github.main-review.census', () => {
  given('[case1] an owner with one repo of each shape', () => {
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
            { number: 13, reviewDecision: 'CHANGES_REQUESTED' }, // ambiguous too: read the next pr
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
          rows: sandbox.readRows(),
          calls: sandbox.readCalls(),
          scratch: sandbox.readScratchDirs(),
        };
      });

      then('it exits 0 with the tally', () => {
        expect(result.stderr).toEqual('');
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain('acme: 10 repos listed');
        expect(result.stdout).toContain('repos read: 8 (skipped 2 archived or forked)');
        expect(result.stdout).toContain('requires: 3 (2 certain, 1 inferred)');
        expect(result.stdout).toContain(
          'lacks: 3 (2 certain, 1 inferred; 2 with a release workflow)',
        );
        expect(result.stdout).toContain('unknown: 2');
        expect(result.stdout).toContain('└─ landed, at paths from the repo root');
        expect(result.stdout).toContain('├─ table: .log/github.main-review.census/census.md');
        expect(result.stdout).toContain(
          '└─ rows: .log/github.main-review.census/rows.tsv (each repo, with its perm and basis)',
        );
      });
      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
      then('each repo carries the verdict its signals decide', () => {
        expect(result.table).toContain('| acme/no-main | no | unknown | no main branch |');
        expect(result.table).toContain('| acme/bare | yes | lacks | main unprotected |');
        expect(result.table).toContain('| acme/ruled | yes | requires | ruleset: 2 approvals |');
        expect(result.table).toContain(
          '| acme/admin-gated | yes | requires | protection: 1 approval |',
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
      then('rows.tsv carries the perm and basis the table drops, and matches snapshot', () => {
        expect(result.rows).toContain('acme/admin-gated\tyes\trequires\tprotection: 1 approval\tADMIN\tcertain');
        expect(result.rows).toContain('acme/push-open\tyes\tlacks\tpr #7 reviewDecision=(empty)\tWRITE\tinferred');
        expect(result.rows).toMatchSnapshot();
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

  given('[case2] the bare invocation, over the four default owners', () => {
    const sandbox = genCensusSandbox({ slug: 'census-bare' });

    when('[t0] the census runs with only the selectors rhx forwards', () => {
      const result = useThen('it completes', async () => {
        sandbox.init();
        ['ehmpathy', 'ahbode', 'whodisio', 'uladkasach'].forEach((owner) =>
          seedOwnerWithOneOpenRepo(sandbox, { owner }),
        );
        // what `rhx github.main-review.census` passes: its own selectors, no owners
        return sandbox.run(['--repo', '.this', '--skill=github.main-review.census']);
      });

      then('the selectors are consumed, and it walks the four owners the help names, in order', () => {
        expect(result.stderr).toEqual('');
        expect(result.code).toEqual(0);
        expect(result.stdout).toContain("--owners 'ehmpathy ahbode whodisio uladkasach'");
        expect(result.stdout).toContain('uladkasach: 1 repo listed');
        expect(result.stdout).toContain('repos read: 4 (skipped 0 archived or forked)');
      });
      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] two runs in one repo, each scoped to another owner', () => {
    const sandbox = genCensusSandbox({ slug: 'census-two-runs' });

    when('[t0] the census runs for acme, then for beta, in each --owners form', () => {
      const result = useThen('both complete', async () => {
        sandbox.init();
        ['acme', 'beta'].forEach((owner) => seedOwnerWithOneOpenRepo(sandbox, { owner }));
        const runAcme = sandbox.run(['--owners', 'acme']);
        const tableAcme = sandbox.readTable();
        const runBeta = sandbox.run(['--owners=beta']);
        const tableBeta = sandbox.readTable();
        return { runAcme, tableAcme, runBeta, tableBeta, rowsBeta: sandbox.readRows() };
      });

      then('each run exits 0, and the = form reads as the spaced form', () => {
        expect(result.runAcme.code).toEqual(0);
        expect(result.runBeta.code).toEqual(0);
        expect(result.runBeta.stdout).toContain("--owners 'beta'");
      });
      then('the second table replaces the first: it holds beta, never acme', () => {
        expect(result.tableAcme).toContain('| acme/app |');
        expect(result.tableBeta).toContain('| beta/app |');
        expect(result.tableBeta).not.toContain('acme/');
        expect(result.rowsBeta).not.toContain('acme/');
      });
    });
  });

  given('[case4] a caller outside any git repo', () => {
    const sandbox = genCensusSandbox({ slug: 'census-no-repo' });

    when('[t0] the census runs where git finds no repo', () => {
      const result = useThen('it runs', async () =>
        // no init, so no git repo here; git's upward search halts at the sandbox's parent dir
        sandbox.run(['--owners', 'acme'], {
          envExtra: { GIT_CEILING_DIRECTORIES: path.dirname(sandbox.tempDir) },
        }),
      );

      then('it exits 2 with a ConstraintError that names the fix', () => {
        expect(result.code).toEqual(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: the census must run inside a git repo',
        );
        expect(result.stdout).toEqual('');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  FAILURE_CASES.map((thisCase) =>
    given(thisCase.given, () => {
      const sandbox = genCensusSandbox({ slug: thisCase.slug });

      when('[t0] the census runs', () => {
        const result = useThen('it fails', async () => {
          sandbox.init();
          thisCase.seed(sandbox);
          const run = sandbox.run(thisCase.args);
          return { ...run, tableFound: sandbox.isTableFound() };
        });

        then(`it exits ${thisCase.expect.code}, and stderr names the error and its fix`, () => {
          expect(result.code).toEqual(thisCase.expect.code);
          thisCase.expect.stderr.forEach((line) => expect(result.stderr).toContain(line));
          thisCase.expect.stderrLacks.forEach((line) => expect(result.stderr).not.toContain(line));
        });
        then('it gives no verdict and lands no partial table', () => {
          expect(result.stdout).not.toContain('census done');
          expect(result.tableFound).toEqual(false);
        });
        then('stderr matches snapshot', () => {
          expect(result.stderr).toMatchSnapshot();
        });
        then('stdout, cut short, matches snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });
      });
    }),
  );
});
