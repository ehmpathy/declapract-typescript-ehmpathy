import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getTestdbIdentity } from './best-practice/src/.test/assets/database/getTestdbIdentity';
import { getTestdbPort } from './best-practice/src/.test/assets/database/getTestdbPort';

/**
 * .what = proves each worktree of a repo gets a testdb of its own (#674): its own compose
 *         project, container, and host port, while ci and a main checkout keep port 7821
 * .why = two worktrees that share one testdb read and clobber each other's rows, and a
 *        `start:testdb` in one stops the other's db mid-run
 * .teeth = drop the worktree branch from getTestdbIdentity and case2 reddens; route a compose
 *          command around compose.sh, or pin the compose port, and case5 reddens; read the port
 *          straight off the config in a reader, or import a testdb test asset from a prod path,
 *          and case5 reddens
 * .note = getTestdbIdentity and getTestdbPort are test assets (`src/.test/assets/database/`): the
 *         app never imports them, it reads the TESTDB_PORT the test harness declares
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it runs git and bash in temp repos;
 *         case8 drives clear's branches through a docker stand-in, and case10 runs clear against
 *         the real docker daemon with a real neighbor container on the port
 */

jest.setTimeout(5 * 60 * 1000);

const BEST_PRACTICE_DIR = join(__dirname, 'best-practice');
const REPO_NODE_MODULES = join(__dirname, '../../../node_modules');
const PORT_DECLARED = 7821;
const ENV_LOCAL = { ...process.env, CI: '' };

/**
 * .what = run git in a dir, with an author so a commit needs no global config
 */
const runGit = (input: { cwd: string; args: string[] }): string =>
  execFileSync(
    'git',
    [
      '-c',
      'user.name=surfer',
      '-c',
      'user.email=surfer@example.com',
      ...input.args,
    ],
    { cwd: input.cwd, encoding: 'utf8' },
  );

/**
 * .what = a temp repo with one commit, plus two linked worktrees of it
 */
const genRepoWithWorktrees = (input: {
  slug: string;
  files: Record<string, string>;
}): { main: string; worktreeA: string; worktreeB: string } => {
  const root = genTempDir({ slug: input.slug });
  const main = join(root, 'main');
  mkdirSync(main, { recursive: true });
  Object.entries(input.files).forEach(([path, source]) => {
    mkdirSync(join(main, path, '..'), { recursive: true });
    writeFileSync(join(main, path), source);
  });
  runGit({ cwd: main, args: ['init', '-q', '-b', 'main'] });
  runGit({ cwd: main, args: ['add', '-A'] });
  runGit({ cwd: main, args: ['commit', '-q', '--allow-empty', '-m', 'init'] });
  const worktreeA = join(root, 'worktree-a');
  const worktreeB = join(root, 'worktree-b');
  runGit({ cwd: main, args: ['worktree', 'add', '-q', '-b', 'a', worktreeA] });
  runGit({ cwd: main, args: ['worktree', 'add', '-q', '-b', 'b', worktreeB] });
  return { main, worktreeA, worktreeB };
};

describe('persist-with-rds testdb per worktree (#674)', () => {
  given('[case1] a main checkout', () => {
    const repo = useBeforeAll(async () =>
      genRepoWithWorktrees({ slug: 'testdb-per-worktree-main', files: {} }),
    );

    then('it keeps the declared port and no suffix, as before', () => {
      expect(
        getTestdbIdentity(
          { portDeclared: PORT_DECLARED },
          { cwd: repo.main, env: ENV_LOCAL },
        ),
      ).toEqual({ suffix: '', port: PORT_DECLARED });
    });
  });

  given('[case2] two linked worktrees of one repo', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithWorktrees({
        slug: 'testdb-per-worktree-linked',
        files: {},
      });
      return {
        a: getTestdbIdentity(
          { portDeclared: PORT_DECLARED },
          { cwd: repo.worktreeA, env: ENV_LOCAL },
        ),
        aAgain: getTestdbIdentity(
          { portDeclared: PORT_DECLARED },
          { cwd: repo.worktreeA, env: ENV_LOCAL },
        ),
        b: getTestdbIdentity(
          { portDeclared: PORT_DECLARED },
          { cwd: repo.worktreeB, env: ENV_LOCAL },
        ),
      };
    });

    then('each derives a suffix of its own', () => {
      expect(scene.a.suffix).toMatch(/^-[0-9a-f]{6}$/);
      expect(scene.b.suffix).toMatch(/^-[0-9a-f]{6}$/);
      expect(scene.a.suffix).not.toEqual(scene.b.suffix);
    });

    then('each binds a port of its own, never the declared one', () => {
      [scene.a.port, scene.b.port].forEach((port) => {
        expect(port).toBeGreaterThan(PORT_DECLARED);
        expect(port).toBeLessThan(PORT_DECLARED + 1000);
      });
      expect(scene.a.port).not.toEqual(scene.b.port);
    });

    then('a worktree lands on the same identity every time', () => {
      expect(scene.aAgain).toEqual(scene.a);
    });
  });

  given('[case3] a linked worktree in ci', () => {
    const repo = useBeforeAll(async () =>
      genRepoWithWorktrees({ slug: 'testdb-per-worktree-ci', files: {} }),
    );

    then('it keeps the declared port, so ci behaves as before', () => {
      expect(
        getTestdbIdentity(
          { portDeclared: PORT_DECLARED },
          { cwd: repo.worktreeA, env: { ...process.env, CI: 'true' } },
        ),
      ).toEqual({ suffix: '', port: PORT_DECLARED });
    });
  });

  given('[case4] a reader asks for its port', () => {
    then('an access other than test keeps its declared port', () => {
      expect(getTestdbPort({ access: 'prep', portDeclared: 5432 })).toEqual(
        5432,
      );
    });

    then('test access dials the identity this checkout derives', () => {
      expect(
        getTestdbPort({ access: 'test', portDeclared: PORT_DECLARED }),
      ).toEqual(getTestdbIdentity({ portDeclared: PORT_DECLARED }).port);
    });
  });

  given('[case5] the shipped templates', () => {
    const read = (path: string) =>
      readFileSync(join(BEST_PRACTICE_DIR, path), 'utf8');

    then('the compose project, container, and port take the derived values', () => {
      const compose = read('provision/docker/testdb/docker-compose.yml');
      expect(compose).toContain(
        'name: @declapract{variable.databaseName}${TESTDB_SUFFIX:-}',
      );
      expect(compose).toContain(
        'container_name: @declapract{variable.databaseName}${TESTDB_SUFFIX:-}',
      );
      expect(compose).toContain('- ${TESTDB_PORT:-7821}:5432');
      expect(compose).not.toContain('- 7821:5432');
    });

    then('every compose command goes through compose.sh', () => {
      const commands: string[] = Object.values(
        JSON.parse(read('package.json')).scripts,
      );
      expect(
        commands.filter((command) => command.includes('docker compose')),
      ).toEqual([]);
      expect(
        commands.filter((command) =>
          command.includes('bash provision/docker/testdb/compose.sh'),
        ).length,
      ).toBeGreaterThanOrEqual(4);
    });

    then('the app dials the TESTDB_PORT override, never the test asset', () => {
      const factory = read('src/utils/database/getOneDatabaseConnection.ts');
      expect(factory).toContain('getOneDatabasePort({');
      expect(factory).not.toContain('getTestdbPort');
      expect(factory).not.toContain('.test/');
    });

    then('the schema provisioner dials getTestdbPort, from the test assets', () => {
      const config = read('provision/schema/connection.config.js');
      expect(config).toContain('getTestdbPort({');
      expect(config).toContain(
        "require('../../src/.test/assets/database/getTestdbPort')",
      );
    });

    then('no prod path under src/ imports a testdb test asset', () => {
      const prodImporters = readdirSync(join(BEST_PRACTICE_DIR, 'src/utils'), {
        recursive: true,
      })
        .map((entry) => entry.toString())
        .filter((path) => path.endsWith('.ts') && !path.endsWith('.test.ts'))
        .filter((path) =>
          /getTestdb(Port|Identity)|\.test\/assets/.test(
            read(join('src/utils', path)),
          ),
        );
      expect(prodImporters).toEqual([]);
    });
  });

  given('[case6] compose.sh, run in a linked worktree', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithWorktrees({
        slug: 'testdb-per-worktree-compose',
        files: {
          'src/.test/assets/database/getTestdbIdentity.ts': readFileSync(
            join(BEST_PRACTICE_DIR, 'src/.test/assets/database/getTestdbIdentity.ts'),
            'utf8',
          ),
          'config/test.json': JSON.stringify({
            database: { tunnel: { local: { host: 'localhost', port: 7821 } } },
          }),
          'provision/docker/testdb/docker-compose.yml': 'services: {}\n',
        },
      });
      copyFileSync(
        join(BEST_PRACTICE_DIR, 'provision/docker/testdb/compose.sh'),
        join(repo.worktreeA, 'provision/docker/testdb/compose.sh'),
      );
      symlinkSync(REPO_NODE_MODULES, join(repo.worktreeA, 'node_modules'));

      // a docker stand-in that reports what compose would have received
      const bin = join(repo.worktreeA, '.bin');
      mkdirSync(bin);
      writeFileSync(
        join(bin, 'docker'),
        '#!/usr/bin/env bash\necho "suffix=$TESTDB_SUFFIX port=$TESTDB_PORT args=$*"\n',
      );
      chmodSync(join(bin, 'docker'), 0o755);

      const result = spawnSync(
        'bash',
        ['provision/docker/testdb/compose.sh', 'up', '-d'],
        {
          cwd: repo.worktreeA,
          encoding: 'utf8',
          env: { ...ENV_LOCAL, PATH: `${bin}:${process.env.PATH}` },
        },
      );
      const identity = getTestdbIdentity(
        { portDeclared: PORT_DECLARED },
        { cwd: repo.worktreeA, env: ENV_LOCAL },
      );
      return { result, identity, worktree: realpathSync(repo.worktreeA) };
    });

    then('it exits 0', () => {
      expect(scene.result.stderr).toEqual('');
      expect(scene.result.status).toEqual(0);
    });

    then('docker compose receives the worktree identity and the args', () => {
      expect(scene.result.stdout.trim()).toEqual(
        `suffix=${scene.identity.suffix} port=${scene.identity.port} args=compose -f ${scene.worktree}/provision/docker/testdb/docker-compose.yml up -d`,
      );
    });
  });

  given('[case7] compose.sh, where the identity util yields a malformed port', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithWorktrees({
        slug: 'testdb-per-worktree-compose-malformed',
        files: {
          'src/.test/assets/database/getTestdbIdentity.ts':
            "export const getTestdbIdentity = (_input: { portDeclared: number }) => ({ suffix: '-abc123', port: Number.NaN });\n",
          'config/test.json': JSON.stringify({
            database: { tunnel: { local: { host: 'localhost', port: 7821 } } },
          }),
          'provision/docker/testdb/docker-compose.yml': 'services: {}\n',
        },
      });
      copyFileSync(
        join(BEST_PRACTICE_DIR, 'provision/docker/testdb/compose.sh'),
        join(repo.worktreeA, 'provision/docker/testdb/compose.sh'),
      );
      symlinkSync(REPO_NODE_MODULES, join(repo.worktreeA, 'node_modules'));

      // a docker stand-in that reports any call it receives
      const bin = join(repo.worktreeA, '.bin');
      mkdirSync(bin);
      writeFileSync(join(bin, 'docker'), '#!/usr/bin/env bash\necho "docker called"\n');
      chmodSync(join(bin, 'docker'), 0o755);

      const result = spawnSync(
        'bash',
        ['provision/docker/testdb/compose.sh', 'up', '-d'],
        {
          cwd: repo.worktreeA,
          encoding: 'utf8',
          env: { ...ENV_LOCAL, PATH: `${bin}:${process.env.PATH}` },
        },
      );
      return { result };
    });

    then('it halts with exit 1 and names the malformed identity', () => {
      expect(scene.result.status).toEqual(1);
      expect(scene.result.stderr).toContain(
        "💥 MalfunctionError: getTestdbIdentity yielded '-abc123 NaN'",
      );
      expect(scene.result.stderr).toMatchSnapshot('compose.sh malfunction — malformed identity');
    });

    then('docker compose is never called', () => {
      expect(scene.result.stdout).not.toContain('docker called');
    });
  });

  given('[case7.1] compose.sh, where the identity cannot be derived at all', () => {
    /**
     * .what = run `compose.sh up -d` in a worktree whose identity step faults, with a docker
     *         stand-in that reports any call it receives
     */
    const runComposeUp = (input: { slug: string; testConfig: string | null }) => {
      const repo = genRepoWithWorktrees({
        slug: input.slug,
        files: {
          'src/.test/assets/database/getTestdbIdentity.ts': readFileSync(
            join(BEST_PRACTICE_DIR, 'src/.test/assets/database/getTestdbIdentity.ts'),
            'utf8',
          ),
          ...(input.testConfig === null ? {} : { 'config/test.json': input.testConfig }),
          'provision/docker/testdb/docker-compose.yml': 'services: {}\n',
        },
      });
      copyFileSync(
        join(BEST_PRACTICE_DIR, 'provision/docker/testdb/compose.sh'),
        join(repo.worktreeA, 'provision/docker/testdb/compose.sh'),
      );
      symlinkSync(REPO_NODE_MODULES, join(repo.worktreeA, 'node_modules'));
      const bin = join(repo.worktreeA, '.bin');
      mkdirSync(bin);
      writeFileSync(join(bin, 'docker'), '#!/usr/bin/env bash\necho "docker called"\n');
      chmodSync(join(bin, 'docker'), 0o755);
      return spawnSync('bash', ['provision/docker/testdb/compose.sh', 'up', '-d'], {
        cwd: repo.worktreeA,
        encoding: 'utf8',
        env: { ...ENV_LOCAL, PATH: `${bin}:${process.env.PATH}` },
      });
    };

    when('[t0] config/test.json is absent', () => {
      const result = useBeforeAll(async () =>
        runComposeUp({ slug: 'testdb-per-worktree-compose-noconfig', testConfig: null }),
      );

      then('it halts with exit 2, names the absent file and its fix, and never shows node words', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: config/test.json not found — the testdb identity cannot be derived',
        );
        expect(result.stderr).toContain('fix: add config/test.json with database.tunnel.local.port');
        expect(result.stderr).not.toContain('Cannot find module');
        expect(result.stderr).not.toContain('Require stack');
        expect(result.stderr).not.toMatch(/\n\s+at /);
        expect(result.stdout).not.toContain('docker called');
        expect(result.stderr).toMatchSnapshot('compose.sh constraint — absent config');
      });
    });

    when('[t1] config/test.json declares no port', () => {
      const result = useBeforeAll(async () =>
        runComposeUp({
          slug: 'testdb-per-worktree-compose-noport',
          testConfig: JSON.stringify({ database: { tunnel: {} } }),
        }),
      );

      then('it halts with exit 2 and names the absent key, never a TypeError', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          'cause: config/test.json declares no numeric database.tunnel.local.port',
        );
        expect(result.stderr).not.toContain('TypeError');
        expect(result.stdout).not.toContain('docker called');
        expect(result.stderr).toMatchSnapshot('compose.sh constraint — portless config');
      });
    });
  });

  given('[case8] compose.sh clear, on a host shared with another testdb (#805 #807)', () => {
    /**
     * .what = run `compose.sh clear` in a main checkout, with a docker stand-in that logs each
     *         call and answers `ps` with the given holder of the port, or faults on the named verb
     *         (`ps` or `compose`) as a daemon that does not answer
     */
    const runClear = (input: { slug: string; holder: string; faultOn: 'ps' | 'compose' | null }) => {
      const repo = genRepoWithWorktrees({
        slug: input.slug,
        files: {
          'src/.test/assets/database/getTestdbIdentity.ts': readFileSync(
            join(BEST_PRACTICE_DIR, 'src/.test/assets/database/getTestdbIdentity.ts'),
            'utf8',
          ),
          'config/test.json': JSON.stringify({
            database: { tunnel: { local: { host: 'localhost', port: 7821 } } },
          }),
          'provision/docker/testdb/docker-compose.yml': 'services: {}\n',
        },
      });
      copyFileSync(
        join(BEST_PRACTICE_DIR, 'provision/docker/testdb/compose.sh'),
        join(repo.main, 'provision/docker/testdb/compose.sh'),
      );
      symlinkSync(REPO_NODE_MODULES, join(repo.main, 'node_modules'));
      const bin = join(repo.main, '.bin');
      const callsPath = join(repo.main, 'docker.calls');
      mkdirSync(bin);
      writeFileSync(
        join(bin, 'docker'),
        [
          '#!/usr/bin/env bash',
          `echo "$*" >> "${callsPath}"`,
          'if [[ "$1" == "$DOCKER_FAULT_ON" ]]; then echo "Cannot connect to the Docker daemon" >&2; exit 1; fi',
          'if [[ "$1" == "ps" ]]; then printf "%s" "$DOCKER_PS_HOLDER"; fi',
        ].join('\n'),
      );
      chmodSync(join(bin, 'docker'), 0o755);
      const result = spawnSync('bash', ['provision/docker/testdb/compose.sh', 'clear'], {
        cwd: repo.main,
        encoding: 'utf8',
        env: {
          ...ENV_LOCAL,
          PATH: `${bin}:${process.env.PATH}`,
          // each row is `name|project|compose dir`; `{SELF_DIR}` stands for this checkout's compose dir
          DOCKER_PS_HOLDER: input.holder.replaceAll(
            '{SELF_DIR}',
            realpathSync(join(repo.main, 'provision/docker/testdb')),
          ),
          DOCKER_FAULT_ON: input.faultOn ?? '',
        },
      });
      return { result, calls: readFileSync(callsPath, 'utf8').trim().split('\n') };
    };

    when('[t0] the port is free after this project is down', () => {
      const scene = useBeforeAll(async () =>
        runClear({ slug: 'testdb-clear-free', holder: '', faultOn: null }),
      );

      then('it exits 0 and says the port is available', () => {
        expect(scene.result.status).toEqual(0);
        expect(scene.result.stdout).toContain('ensured port 7821 is available');
        expect(scene.result.stdout).toMatchSnapshot('compose.sh clear — port free');
      });

      then('it downs only its own compose project, then asks who holds the port', () => {
        expect(scene.calls[0]).toMatch(/^compose -f .*docker-compose\.yml down --remove-orphans$/);
        expect(scene.calls[1]).toContain('ps --filter publish=7821');
        expect(scene.calls[1]).not.toMatch(/ -a( |$)/);
      });

      then('it never removes a container by port', () => {
        expect(scene.calls.filter((call) => call.startsWith('rm'))).toEqual([]);
      });
    });

    when('[t1] another repo still holds the port', () => {
      const scene = useBeforeAll(async () =>
        runClear({
          slug: 'testdb-clear-held',
          holder: 'svcjobs|svcjobs|/home/neighbor/svc-jobs/provision/docker/testdb',
          faultOn: null,
        }),
      );

      then('it halts with exit 2 and names the holder and the fix', () => {
        expect(scene.result.status).toEqual(2);
        expect(scene.result.stderr).toContain(
          "✋ ConstraintError: port 7821 is held by a container outside this checkout's compose project",
        );
        expect(scene.result.stderr).toContain('holder: svcjobs (project: svcjobs)');
        expect(scene.result.stderr).toContain('another worktree of this repo: stop that testdb from its own checkout');
        expect(scene.result.stderr).toContain('another repo: declare another port in config/test.json');
        expect(scene.result.stderr).toMatchSnapshot('compose.sh clear — one holder');
      });

      then('it offers no copy-paste removal of a neighbor testdb', () => {
        expect(scene.result.stderr).not.toContain('docker rm -f');
      });

      then('it leaves the other testdb in place', () => {
        expect(scene.calls.filter((call) => call.startsWith('rm'))).toEqual([]);
      });
    });

    when('[t2] two containers hold the port', () => {
      const scene = useBeforeAll(async () =>
        runClear({
          slug: 'testdb-clear-held-twice',
          holder: 'svcjobs|svcjobs|/home/a/provision/docker/testdb\nsvcquotes|svcquotes|/home/b/provision/docker/testdb',
          faultOn: null,
        }),
      );

      then('it names both holders on the one holder branch, so the tree stays whole', () => {
        expect(scene.result.status).toEqual(2);
        expect(scene.result.stderr).toContain(
          'holder: svcjobs (project: svcjobs), svcquotes (project: svcquotes)',
        );
        expect(scene.result.stderr).toMatchSnapshot('compose.sh clear — two holders');
      });
    });

    when('[t3] docker cannot list the containers after the down', () => {
      const scene = useBeforeAll(async () =>
        runClear({ slug: 'testdb-clear-ps-fault', holder: '', faultOn: 'ps' }),
      );

      then('it halts with exit 1 and names the fault, the state left, and the fix', () => {
        expect(scene.result.status).toEqual(1);
        expect(scene.result.stderr).toContain(
          '💥 MalfunctionError: could not list the containers that hold port 7821',
        );
        expect(scene.result.stderr).toContain("this checkout's own project is down");
        // snap from the header on; docker's own words precede it and vary by docker version
        const clearOwnStderr = scene.result.stderr.slice(scene.result.stderr.indexOf('💥'));
        expect(clearOwnStderr).toMatchSnapshot('compose.sh clear — docker fault');
      });

      then('it never reports the port as available', () => {
        expect(scene.result.stdout).not.toContain('is available');
      });
    });

    when('[t4] docker cannot take down this project', () => {
      const scene = useBeforeAll(async () =>
        runClear({ slug: 'testdb-clear-down-fault', holder: '', faultOn: 'compose' }),
      );

      then('it halts with exit 1 and names the fault, the state left, and the fix', () => {
        expect(scene.result.status).toEqual(1);
        expect(scene.result.stderr).toContain(
          "💥 MalfunctionError: could not take down this checkout's testdb compose project",
        );
        expect(scene.result.stderr).toContain('no other container was touched');
        // snap from the header on; docker's own words precede it and vary by docker version
        const clearOwnStderr = scene.result.stderr.slice(scene.result.stderr.indexOf('💥'));
        expect(clearOwnStderr).toMatchSnapshot('compose.sh clear — docker down fault');
      });

      then('it never asks who holds the port, nor reports it as available', () => {
        expect(scene.calls.filter((call) => call.startsWith('ps'))).toEqual([]);
        expect(scene.result.stdout).not.toContain('is available');
      });
    });

    when('[t5] a hand-run container with no compose project holds the port', () => {
      const scene = useBeforeAll(async () =>
        runClear({ slug: 'testdb-clear-held-bare', holder: 'pg-handrun||', faultOn: null }),
      );

      then('it names the holder as one with no compose project, never an empty label', () => {
        expect(scene.result.status).toEqual(2);
        expect(scene.result.stderr).toContain('holder: pg-handrun (no compose project)');
        expect(scene.result.stderr).not.toContain('(project: )');
        expect(scene.result.stderr).toMatchSnapshot('compose.sh clear — holder with no compose project');
      });
    });

    when('[t6] this checkout own testdb, under an older project name, holds the port', () => {
      const scene = useBeforeAll(async () =>
        runClear({
          slug: 'testdb-clear-held-own',
          holder: 'svcjobs_testdb|svcjobs_old|{SELF_DIR}\nsvcquotes|svcquotes|/home/b/provision/docker/testdb',
          faultOn: null,
        }),
      );

      then('it halts with exit 2, and offers the removal for its own holder only, by name', () => {
        expect(scene.result.status).toEqual(2);
        // the nearest fix leads the fix branch: its own holder, by name
        expect(scene.result.stderr).toContain(
          "   └─ fix\n      ├─ this checkout's own testdb, under an older project name: docker rm -f svcjobs_testdb\n",
        );
        expect(scene.result.stderr).not.toContain('docker rm -f svcquotes');
        // the header and the why stay true beside the own-holder fix: they never claim the checkout lacks it
        expect(scene.result.stderr).not.toContain('does not own');
        expect(scene.result.stderr).not.toContain('another repo or worktree runs');
        expect(scene.result.stderr).toMatchSnapshot('compose.sh clear — own older-project holder');
      });

      then('it removes no container itself', () => {
        expect(scene.calls.filter((call) => call.startsWith('rm'))).toEqual([]);
      });
    });
  });

  given('[case9] the shipped clear command', () => {
    when('[t0] the shipped package.json is read', () => {
      then('it runs compose.sh clear, never a removal by published port', () => {
        const commands = JSON.parse(readFileSync(join(BEST_PRACTICE_DIR, 'package.json'), 'utf8')).scripts;
        expect(commands['provision:testdb:docker:clear']).toEqual('bash provision/docker/testdb/compose.sh clear');
        expect(Object.values<string>(commands).filter((command) => command.includes('publish='))).toEqual([]);
      });
    });
  });

  given('[case10] compose.sh clear, against the real docker daemon (#805 #807)', () => {
    // a neighbor container this test owns, named so the cleanup and the asserts find it
    const neighborName = `declapract-clear-neighbor-${process.pid}`;
    // this checkout's own testdb, in a compose project of its own
    const ownProjectName = `declapract-clear-own-${process.pid}`;
    const ownName = `${ownProjectName}-testdb`;
    afterAll(() => {
      spawnSync('docker', ['rm', '-f', neighborName, ownName], { encoding: 'utf8' });
    });

    const scene = useBeforeAll(async () => {
      // a port the os grants free, declared as this checkout's testdb port
      const port = Number(
        execFileSync('node', ['-e', "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})"], {
          encoding: 'utf8',
        }),
      );
      const repo = genRepoWithWorktrees({
        slug: 'testdb-clear-real-docker',
        files: {
          'src/.test/assets/database/getTestdbIdentity.ts': readFileSync(
            join(BEST_PRACTICE_DIR, 'src/.test/assets/database/getTestdbIdentity.ts'),
            'utf8',
          ),
          'config/test.json': JSON.stringify({ database: { tunnel: { local: { host: 'localhost', port } } } }),
          'provision/docker/testdb/docker-compose.yml': 'services: {}\n',
        },
      });
      copyFileSync(
        join(BEST_PRACTICE_DIR, 'provision/docker/testdb/compose.sh'),
        join(repo.main, 'provision/docker/testdb/compose.sh'),
      );
      symlinkSync(REPO_NODE_MODULES, join(repo.main, 'node_modules'));
      const runClearReal = () =>
        spawnSync('bash', ['provision/docker/testdb/compose.sh', 'clear'], {
          cwd: repo.main,
          encoding: 'utf8',
          env: ENV_LOCAL,
        });

      // the port is free: the real daemon downs the empty project and lists no holder
      const resultFree = runClearReal();

      // a real container, outside this checkout's compose project, now holds the port
      const neighbor = spawnSync(
        'docker',
        ['run', '-d', '--rm', '--name', neighborName, '-p', `127.0.0.1:${port}:5432`, '--entrypoint', 'sleep', 'postgres:16-alpine', '300'],
        { encoding: 'utf8', timeout: 180_000 },
      );
      if (neighbor.status !== 0) throw new Error(`docker run of the neighbor failed: ${neighbor.stderr}`);
      const resultHeld = runClearReal();
      const neighborStateAfter = spawnSync('docker', ['inspect', '-f', '{{.State.Status}}', neighborName], {
        encoding: 'utf8',
      }).stdout.trim();

      // the neighbor leaves; this checkout's own compose project now holds the port
      spawnSync('docker', ['rm', '-f', neighborName], { encoding: 'utf8' });
      writeFileSync(
        join(repo.main, 'provision/docker/testdb/docker-compose.yml'),
        [
          `name: ${ownProjectName}`,
          'services:',
          '  testdb:',
          `    container_name: ${ownName}`,
          '    image: postgres:16-alpine',
          "    entrypoint: ['sleep', '300']",
          '    ports:',
          "      - '127.0.0.1:${TESTDB_PORT}:5432'",
          '',
        ].join('\n'),
      );
      const ownUp = spawnSync('bash', ['provision/docker/testdb/compose.sh', 'up', '-d'], {
        cwd: repo.main,
        encoding: 'utf8',
        env: ENV_LOCAL,
        timeout: 180_000,
      });
      if (ownUp.status !== 0) throw new Error(`compose.sh up of the own project failed: ${ownUp.stderr}`);
      const resultOwn = runClearReal();
      const holdersAfterOwn = spawnSync('docker', ['ps', '-q', '--filter', `publish=${port}`], {
        encoding: 'utf8',
      }).stdout.trim();

      return { port, resultFree, resultHeld, neighborStateAfter, resultOwn, holdersAfterOwn };
    });

    when('[t0] no container holds the port', () => {
      then('it exits 0 and says the port is available', () => {
        expect(scene.resultFree.status).toEqual(0);
        expect(scene.resultFree.stdout).toContain(`ensured port ${scene.port} is available`);
      });
    });

    when('[t1] a real neighbor container holds the port', () => {
      then('it halts with exit 2 and names the neighbor as a holder with no compose project', () => {
        expect(scene.resultHeld.status).toEqual(2);
        expect(scene.resultHeld.stderr).toContain(
          `✋ ConstraintError: port ${scene.port} is held by a container outside this checkout's compose project`,
        );
        expect(scene.resultHeld.stderr).toContain(`holder: ${neighborName} (no compose project)`);
        expect(scene.resultHeld.stderr).not.toContain('docker rm -f');
      });

      then('the neighbor still runs: a clear never evicts another container', () => {
        // docker names a live container's status `running`
        expect(scene.neighborStateAfter).toEqual('running');
      });
    });

    when('[t2] this checkout\'s own compose project holds the port', () => {
      then('it removes its own testdb, exits 0, and the port is free', () => {
        expect(scene.resultOwn.status).toEqual(0);
        expect(scene.resultOwn.stdout).toContain(`ensured port ${scene.port} is available`);
        expect(scene.holdersAfterOwn).toEqual('');
      });
    });
  });
});
