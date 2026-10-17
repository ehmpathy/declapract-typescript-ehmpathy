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

import { genTempDir, given, then, useBeforeAll } from 'test-fns';

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
 * .note = INTEGRATION by `rule.forbid.unit.remote-boundaries`: it runs git and bash in temp repos
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
    });

    then('docker compose is never called', () => {
      expect(scene.result.stdout).not.toContain('docker called');
    });
  });
});
