import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = clamps the shipped `test:lint:cycles` command (#601, #616): it reads `.dpdmrc.yaml`
 *         with node and the `yaml` devDependency, never with `yq`, and fails closed.
 * .why  = `yq` is a host binary that no practice declares, so the lint gate only worked on a box
 *         that happened to have it. the old `// "^$"` fallback was dead syntax on top. node is the
 *         one binary every adopter has, and `yaml` ships as a declared devDependency.
 * .note = the subject is the shipped TEMPLATE, read from __dirname. the exclude expression is
 *         lifted out of the command and run for real in a temp dir, so the test proves what an
 *         adopter's shell computes, not merely the text of the command.
 * .teeth = put the `yq` form back in best-practice/package.json and case1 goes red; drop the
 *          `&&` and case3 goes red (a malformed `.dpdmrc.yaml` no longer stops the gate).
 */
const repoRoot = join(__dirname, '../../..');
const shipped = JSON.parse(
  readFileSync(join(__dirname, 'best-practice/package.json'), 'utf8'),
);
const command: string = shipped.scripts['test:lint:cycles'];

/**
 * .what = the shell assignment that computes the dpdm exclude regex, lifted from the command
 */
const asExcludeAssignment = (input: { command: string }): string => {
  const match = input.command.match(/^(EXCL=\$\(.+?\)) && dpdm /);
  if (!match?.[1])
    throw new Error(`no EXCL=$(...) && dpdm prefix in: ${input.command}`);
  return match[1];
};

/**
 * .what = run the exclude assignment in a dir that holds the given `.dpdmrc.yaml`
 */
const runExcludeAssignment = (input: {
  dpdmrc: string;
}): { stdout: string; exitCode: number } => {
  const dir = genTempDir({ slug: 'lint-cycles-exclude' });
  writeFileSync(join(dir, '.dpdmrc.yaml'), input.dpdmrc);
  try {
    const stdout = execFileSync(
      'bash',
      ['-c', `${asExcludeAssignment({ command })} && printf '%s' "$EXCL"`],
      {
        cwd: dir,
        env: { ...process.env, NODE_PATH: join(repoRoot, 'node_modules') },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ).toString();
    return { stdout, exitCode: 0 };
  } catch (error) {
    // allowlist only the child-process exit; jest's vm realm defeats an `instanceof Error` test
    if (typeof error !== 'object' || error === null || !('status' in error))
      throw error;
    return { stdout: '', exitCode: Number(error.status) };
  }
};

describe('lint test:lint:cycles reads .dpdmrc.yaml via node + yaml (#601, #616)', () => {
  given('[case1] the shipped command', () => {
    when('[t0] its text is read', () => {
      then('it holds no yq', () => {
        expect(command).not.toContain('yq');
      });

      then('it holds no dead // "^$" fallback', () => {
        expect(command).not.toContain('// \\"^$\\"');
        expect(command).not.toContain('"^$"');
      });

      then('it requires yaml through node', () => {
        expect(command).toContain("require('yaml')");
      });

      then('the command matches snapshot', () => {
        expect(command).toMatchSnapshot('test:lint:cycles');
      });
    });
  });

  given('[case2] the shipped devDependencies', () => {
    then('yaml is declared, so the require resolves in every adopter', () => {
      expect(shipped.devDependencies.yaml).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  given('[case3] the exclude expression, run in a real shell', () => {
    when('[t0] .dpdmrc.yaml has the shipped empty exclude', () => {
      then('it emits an empty regex and exits 0', () => {
        expect(runExcludeAssignment({ dpdmrc: 'exclude: []\n' })).toEqual({
          stdout: '',
          exitCode: 0,
        });
      });
    });

    when('[t1] .dpdmrc.yaml has no exclude key', () => {
      then('it emits an empty regex and exits 0', () => {
        expect(runExcludeAssignment({ dpdmrc: '# no keys\n' })).toEqual({
          stdout: '',
          exitCode: 0,
        });
      });
    });

    when('[t2] .dpdmrc.yaml holds two adopter entries', () => {
      then('it joins them with |', () => {
        expect(
          runExcludeAssignment({ dpdmrc: 'exclude:\n  - jest\n  - ^foo\n' }),
        ).toEqual({ stdout: 'jest|^foo', exitCode: 0 });
      });
    });

    when('[t3] .dpdmrc.yaml is malformed', () => {
      then('it exits non-zero, so the gate fails closed', () => {
        const result = runExcludeAssignment({ dpdmrc: 'exclude: [\n' });
        expect(result.exitCode).not.toEqual(0);
      });
    });
  });
});
