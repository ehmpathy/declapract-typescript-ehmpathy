import { execSync } from 'child_process';
import { mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = proves the `build:ifstale` command the tests-any practice ships (#622): it builds when
 *         dist holds no stamp, skips when no src/config file is newer than the stamp, rebuilds
 *         when one is, and ignores a newer test file. `test:acceptance:locally` calls it; ci's
 *         `test:acceptance` keeps the full build.
 * .why  = a local acceptance run rebuilt dist on every call, even when dist was fresh. the stamp
 *         is written only after a green build, so a failed build never reads as fresh.
 * .why integration = drives a real `bash -c` against a temp repo — a process + fs boundary.
 */
const PACKAGE_JSON = JSON.parse(
  readFileSync(join(__dirname, 'best-practice/package.json'), 'utf-8'),
);
const COMMANDS: Record<string, string> = PACKAGE_JSON['scripts'];
const COMMAND_IFSTALE = COMMANDS['build:ifstale']!;

/**
 * .what = run the shipped command in a dir with `npm` stood in by a function that records a build
 * .why  = the build itself is out of scope; the skip-or-build choice is the subject
 * .note = returns an object, since useThen proxies its result and a bare string cannot be proxied
 */
const runCommand = (input: { cwd: string; buildExit: number }): { text: string } => ({
  text: execSync(
    `bash -c 'npm() { echo BUILT; mkdir -p dist; return ${input.buildExit}; }; ${COMMAND_IFSTALE.replace(/'/g, `'\\''`)}' || echo EXIT_NONZERO`,
    { cwd: input.cwd, encoding: 'utf-8', timeout: 10_000 },
  ),
});

/**
 * .what = set a file's mtime to a fixed offset from now, in seconds
 * .why  = `find -newer` compares mtimes; fixed offsets make the order explicit
 */
const setMtime = (input: { path: string; offsetSec: number }): void => {
  const at = new Date(Date.now() + input.offsetSec * 1000);
  utimesSync(input.path, at, at);
};

describe('build:ifstale', () => {
  given('[case0] the shipped package.json', () => {
    then('test:acceptance:locally calls build:ifstale, and ci keeps the full build', () => {
      expect(COMMAND_IFSTALE).toBeDefined();
      expect(COMMANDS['test:acceptance:locally']).toContain('npm run build:ifstale &&');
      expect(COMMANDS['test:acceptance']).toContain('npm run build &&');
      expect(COMMANDS['test:acceptance']).not.toContain('build:ifstale');
    });
  });

  given('[case1] a repo with src and no stamp', () => {
    const dir = genTempDir({ slug: 'build-ifstale' });

    when('[t0] the command runs with no stamp', () => {
      const output = useThen('it runs', async () => {
        mkdirSync(join(dir, 'src'), { recursive: true });
        writeFileSync(join(dir, 'src/index.ts'), 'export {};');
        writeFileSync(join(dir, 'package.json'), '{}');
        return runCommand({ cwd: dir, buildExit: 0 });
      });

      then('it builds and writes the stamp', () => {
        expect(output.text).toContain('BUILT');
        expect(readFileSync(join(dir, 'dist/.build.stamp'), 'utf-8')).toEqual('');
      });
    });

    when('[t1] the command runs again with no src change', () => {
      const output = useThen('it runs', async () => {
        setMtime({ path: join(dir, 'src/index.ts'), offsetSec: -120 });
        setMtime({ path: join(dir, 'package.json'), offsetSec: -120 });
        setMtime({ path: join(dir, 'dist/.build.stamp'), offsetSec: -60 });
        return runCommand({ cwd: dir, buildExit: 0 });
      });

      then('it skips the build (idempotent rerun)', () => {
        expect(output.text).not.toContain('BUILT');
        expect(output.text).toContain('dist is fresh, build skipped');
      });
    });

    when('[t2] only a test file is newer than the stamp', () => {
      const output = useThen('it runs', async () => {
        writeFileSync(join(dir, 'src/index.test.ts'), 'test.todo("x");');
        writeFileSync(join(dir, 'src/index.acceptance.test.ts'), 'test.todo("x");');
        return runCommand({ cwd: dir, buildExit: 0 });
      });

      then('it still skips the build', () => {
        expect(output.text).not.toContain('BUILT');
      });
    });

    when('[t3] a src file is newer than the stamp', () => {
      const output = useThen('it runs', async () => {
        writeFileSync(join(dir, 'src/index.ts'), 'export const x = 1;');
        return runCommand({ cwd: dir, buildExit: 0 });
      });

      then('it rebuilds', () => {
        expect(output.text).toContain('BUILT');
      });
    });
  });

  given('[case2] a repo whose build fails', () => {
    const dir = genTempDir({ slug: 'build-ifstale-fail' });

    when('[t0] the command runs and the build exits nonzero', () => {
      const output = useThen('it runs', async () => {
        mkdirSync(join(dir, 'src'), { recursive: true });
        writeFileSync(join(dir, 'src/index.ts'), 'export {};');
        return runCommand({ cwd: dir, buildExit: 1 });
      });

      then('it fails and writes no stamp, so the next run builds again', () => {
        expect(output.text).toContain('EXIT_NONZERO');
        expect(() => readFileSync(join(dir, 'dist/.build.stamp'))).toThrow();
      });
    });
  });
});
