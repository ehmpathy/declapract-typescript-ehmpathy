import fs from 'fs/promises';
import path from 'node:path';

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { check as checkDockerfile } from './best-practice/provision/docker/testdb/build-image.dockerfile.declapract';

/**
 * .what = proves the persist-with-rds surface a postgres major upgrade leans on (#664): a current
 *         `dialect`, a healthcheck that probes the repo's own db, a testdb pin each repo owns, and a
 *         skew check that halts a testdb which leads its livedb
 * .note = the post-upgrade ops (`ALTER EXTENSION … UPDATE`, `ANALYZE`) belong to the repo that
 *         owns the cutover, so this practice declares none of them
 * .why = each lives in bytes the practice declares, so every adopter inherited each defect; and
 *        each new declaration with logic is proven here through the real apply pipeline
 * .teeth = drop the dao fix and [case1] stays on 10.7; compare the dockerfile exactly and [case1]
 *          moves the repo pin to the template's; let the skew check pass a lead and [case3] reddens
 * .note = every touched file is snapshotted in full, before AND after, per
 *         rule.require.declapract-integration-tests
 */
jest.setTimeout(10 * 60 * 1000);

const BEST_PRACTICE_DIR = path.join(__dirname, 'best-practice');
const FILES = [
  'codegen.sql.dao.yml',
  'provision/docker/testdb/build-image.dockerfile',
];

describe('persist-with-rds engine upgrade surface (#664)', () => {
  given('[case1] a repo on dialect 10.7 with its own testdb pin', () => {
    const tempDir = genTempDir({
      slug: 'declapract-persist-with-rds-engine-upgrade',
      clone:
        './src/practices/persist-with-rds/.test/assets/demo-repo-on-a-prior-major',
      symlink: [{ at: 'declarations', to: 'src' }],
    });
    const read = (relativePath: string) =>
      fs
        .readFile(path.join(tempDir, relativePath), 'utf-8')
        .catch((error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return null; // absent is a valid end-state to assert on
          throw error; // any other read failure is a malfunction, never "absent"
        });
    const applyAll = async () => {
      for (const file of FILES)
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'persist-with-rds',
          file,
        });
    };

    when('[t0] the input, before any fix', () => {
      then('each file matches snapshot', async () => {
        for (const file of FILES)
          expect(await read(file)).toMatchSnapshot(`${file} — before`);
      });
    });

    when('[t1] apply runs', () => {
      useThen('apply the declarations', async () => applyAll());

      then('the dao config moves to dialect 17, and keeps its own exclusions', async () => {
        const after = await read(FILES[0]!);
        expect(after).toContain('dialect: 17\n');
        expect(after).not.toContain('dialect: 10.7');
        expect(after).toContain("- 'SurfReportDraft'");
        expect(after).toMatchSnapshot(`${FILES[0]} — after`);
      });

      then('the testdb keeps the pin the repo chose, and the check passes on it', async () => {
        const after = await read(FILES[1]!);
        expect(after).toContain('FROM postgres:17.9\n');
        expect(() =>
          checkDockerfile(after, {
            declaredFileContents: readFileSync(
              path.join(BEST_PRACTICE_DIR, FILES[1]!),
              'utf-8',
            ),
          } as Parameters<typeof checkDockerfile>[1]), // .note = the check reads only declaredFileContents
        ).not.toThrow();
        expect(after).toMatchSnapshot(`${FILES[1]} — after`);
      });
    });

    when('[t2] apply runs a second time', () => {
      const scene = useThen('apply again', async () => {
        const before = await Promise.all(FILES.map((file) => read(file)));
        await applyAll();
        const after = await Promise.all(FILES.map((file) => read(file)));
        return { before, after };
      });

      then('every file is a fixed point', () => {
        expect(scene.after).toEqual(scene.before);
      });
    });
  });

  given('[case2] the shipped templates', () => {
    const read = (relativePath: string) =>
      readFileSync(path.join(BEST_PRACTICE_DIR, relativePath), 'utf-8');

    then('every sql-schema tool config declares dialect 17', () => {
      [
        'provision/schema/control.yml',
        'codegen.sql.schema.yml',
        'codegen.sql.types.yml',
        'codegen.sql.dao.yml',
      ].forEach((file) => expect(read(file)).toContain('\ndialect: 17\n'));
    });

    then('the healthcheck probes the repo own database, not a peer repo name', () => {
      const compose = read('provision/docker/testdb/docker-compose.yml');
      expect(compose).toContain(
        "pg_isready -U postgres -d @declapract{variable.databaseName}'",
      );
      expect(compose).not.toContain('homeservicesdb');
    });

    then('the dockerfile check flags a drift outside the pin line', () => {
      expect(() =>
        checkDockerfile('FROM postgres:17.9\n', {
          declaredFileContents: read(
            'provision/docker/testdb/build-image.dockerfile',
          ),
        } as Parameters<typeof checkDockerfile>[1]),
      ).toThrow('build-image.dockerfile must match the template');
    });
  });

  given('[case3] check-engine-skew.sh', () => {
    const runSkewCheck = (input: { args: string[]; testdbPin: string | null }) => {
      const dir = genTempDir({ slug: 'check-engine-skew' });
      const dockerfile = path.join(dir, 'build-image.dockerfile');
      if (input.testdbPin !== null)
        writeFileSync(dockerfile, `${input.testdbPin}\n`);
      const skewCheckPath = path.join(
        BEST_PRACTICE_DIR,
        'provision/docker/testdb/check-engine-skew.sh',
      );
      const result = spawnSync(
        'bash',
        [skewCheckPath, '--dockerfile', dockerfile, ...input.args],
        {
          encoding: 'utf-8',
          env: { ...process.env, AWS_PROFILE: 'check-engine-skew-absent-profile' },
        },
      );
      // mask both host paths, so the snapshot holds on any checkout
      const asMasked = (text: string) =>
        text
          .replaceAll(dockerfile, '<dockerfile>')
          .replaceAll(skewCheckPath, '<check-engine-skew.sh>');
      return {
        status: result.status,
        stdout: asMasked(result.stdout),
        stderr: asMasked(result.stderr),
      };
    };

    [
      {
        name: 'the testdb leads the livedb',
        testdbPin: 'FROM postgres:17.11',
        args: ['--livedb-version', '13.23'],
        status: 2,
        expected: 'pin the testdb to postgres 13',
      },
      {
        name: 'the testdb leads a livedb below its declared target',
        testdbPin: 'FROM postgres:17.11',
        args: ['--livedb-version', '13.23', '--declared-version', '17.11'],
        status: 2,
        expected: 'the livedb sits below its declared target 17',
      },
      {
        name: 'the testdb trails the livedb',
        testdbPin: 'FROM postgres:13.20',
        args: ['--livedb-version', '17.11'],
        status: 0,
        expected: '::warning title=engine skew::',
      },
      {
        name: 'the majors match',
        testdbPin: 'FROM postgres:17.11',
        args: ['--livedb-version', '17.7'],
        status: 0,
        expected: 'majors match',
      },
      {
        name: 'the dockerfile has no postgres pin',
        testdbPin: 'FROM alpine:3',
        args: ['--livedb-version', '17.11'],
        status: 1,
        expected: "💥 MalfunctionError: no 'FROM postgres:<major>' pin found",
      },
      {
        name: 'a flag with no value',
        testdbPin: 'FROM postgres:17.11',
        args: ['--livedb-version'],
        status: 2,
        expected: '✋ ConstraintError: --livedb-version needs a value',
      },
      {
        name: 'the livedb read fails',
        testdbPin: 'FROM postgres:17.11',
        args: [
          '--config',
          path.join(BEST_PRACTICE_DIR, 'config/test.json'),
        ],
        status: 1,
        expected: 'rds:DescribeDBClusters',
      },
    ].forEach((thisCase, index) =>
      when(`[t${index}] ${thisCase.name}`, () => {
        const result = useThen('the check runs', async () =>
          runSkewCheck({ args: thisCase.args, testdbPin: thisCase.testdbPin }),
        );

        then(`it exits ${thisCase.status} and says so`, () => {
          expect(result.status).toEqual(thisCase.status);
          expect(`${result.stdout}${result.stderr}`).toContain(thisCase.expected);
        });

        then('the check lines match the snapshot', () => {
          expect({
            status: result.status,
            stdout: result.stdout,
            stderr: result.stderr
              .split('\n')
              .filter((line) => /^(✋|💥| {3})/.test(line))
              .join('\n'),
          }).toMatchSnapshot();
        });
      }),
    );
  });
});
