import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join } from 'node:path';

import { MalfunctionError } from 'helpful-errors';
import { genTempDir } from 'test-fns';

/**
 * .what = one diagnostic the installed `tsc` binary printed
 */
export interface TscBinaryDiagnostic {
  file: string; // absolute
  line: number;
  code: string;
  message: string;
}

/**
 * .what = the installed `tsc` binary, the one an adopter's `pnpm install` lands (typescript 7)
 */
const TSC_BIN = join(__dirname, '..', '..', 'node_modules', '.bin', 'tsc'); // anchored on this file, never the jest cwd

/**
 * .what = the major of `tsc` the template floor names
 * .why  = each clamp proves a template under typescript 7; a patch bump of the floor leaves it true
 */
const TSC_VERSION_EXPECTED = /^Version 7\./;

/**
 * .what = the head line of a `--pretty false` diagnostic: `path(line,col): error TSnnnn: message`
 */
const DIAGNOSTIC_HEAD = /^(.+)\((\d+),\d+\): error (TS\d+): (.*)$/;

/**
 * .what = each diagnostic in `tsc --pretty false` output, its indented continuation lines folded in
 */
const asTscBinaryDiagnostics = (input: { output: string }): TscBinaryDiagnostic[] =>
  input.output
    .split('\n')
    .filter((line) => line.trim() !== '')
    .reduce<TscBinaryDiagnostic[]>((diagnostics, line) => {
      const head = line.match(DIAGNOSTIC_HEAD);
      if (head)
        return [
          ...diagnostics,
          { file: head[1] ?? '', line: Number(head[2]), code: head[3] ?? '', message: head[4] ?? '' },
        ];
      const prior = diagnostics.at(-1);
      if (!prior) return [...diagnostics, { file: '(global)', line: 0, code: '', message: line.trim() }];
      return [...diagnostics.slice(0, -1), { ...prior, message: `${prior.message} ${line.trim()}` }];
    }, []);

/**
 * .what = type-checks a set of files with the installed `tsc` binary, from a fresh temp dir
 * .why  = the compiler api tests read templates through `@typescript/typescript6`, a 6.0 checker;
 *         adopters compile those same templates with the typescript 7 binary. this runs the binary
 *         itself, so a template that breaks only under 7 reddens here rather than on an adopter
 * .note = `files` keys are paths relative to the temp dir; an absolute path in `roots` is checked
 *         in place. `compilerOptions` take tsconfig string values, never the api enums
 */
export const getAllDiagnosticsFromTscBinary = (input: {
  slug: string;
  files: Record<string, string>;
  roots: string[];
  compilerOptions: Record<string, unknown>;
}): { version: string; diagnostics: TscBinaryDiagnostic[] } => {
  // lay the fixture files and a tsconfig into a fresh dir
  const dir = genTempDir({ slug: input.slug });
  Object.entries(input.files).forEach(([path, source]) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), source);
  });
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: input.compilerOptions, files: input.roots }, null, 2),
  );

  // run the binary over it
  const run = (args: string[]) =>
    spawnSync(TSC_BIN, args, { cwd: dir, encoding: 'utf-8' });
  const version = run(['--version']);
  const checked = run(['-p', 'tsconfig.json', '--pretty', 'false']);

  // fail loud where the binary never ran, so an empty list always means a clean check
  if (checked.status === null || checked.error)
    throw new MalfunctionError('the installed tsc binary did not run', {
      bin: TSC_BIN,
      error: checked.error?.message ?? null,
      hint: 'run pnpm install, so node_modules/.bin/tsc and its platform package land',
    });
  // fail loud where the binary is not a typescript 7, so a clean list never vouches for another major
  const versionOutput = `${version.stdout}${version.stderr}`.trim();
  if (!TSC_VERSION_EXPECTED.test(versionOutput))
    throw new MalfunctionError('the installed tsc binary is not typescript 7', {
      bin: TSC_BIN,
      version: versionOutput,
      hint: 'run pnpm install, so the typescript devDependency lands at its 7.x floor',
    });

  // tsc prints paths relative to the real dir it ran in, never the genTempDir symlink
  const dirReal = realpathSync(dir);
  return {
    version: versionOutput,
    diagnostics: asTscBinaryDiagnostics({ output: `${checked.stdout}${checked.stderr}` }).map(
      (found) => ({ ...found, file: isAbsolute(found.file) ? found.file : join(dirReal, found.file) }),
    ),
  };
};
