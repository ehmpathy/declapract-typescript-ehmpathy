import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { genTempDir, given, then, useThen, when } from 'test-fns';
import ts from 'typescript';

/**
 * .what = clamps that the expo `jest.*.prepare.ts` templates find the types of the
 *         `test-fns/autoprune.setup.jest` subpath under BOTH module lookups an expo app compiles with
 * .why  = expo sdk < 54 sets `moduleResolution: node`, which ignores `exports`; test-fns ships the
 *         subpath only via `exports`, so the import is TS2307 there (F88). each prepare file reaches the
 *         `src/.test/assets/test-fns.autoprune.d.ts` stand-in via a triple-slash reference, so the
 *         adopter's tsconfig `include` (which skips dot dirs) never has to name it
 * .teeth = drop the reference line from a prepare file, or the stand-in, and [case2] reddens
 * .note = an integration test: the compile reads this repo's installed test-fns from disk
 */
const BEST_PRACTICE_DIR = path.join(__dirname, 'best-practice');
const PREPARE_FILES = [
  path.join(BEST_PRACTICE_DIR, 'jest.integration.prepare.ts'),
  path.join(BEST_PRACTICE_DIR, 'jest.acceptance.prepare.ts'),
];
const SUBPATH = 'test-fns/autoprune.setup.jest';
const REFERENCE_LINE =
  '/// <reference path="./src/.test/assets/test-fns.autoprune.d.ts" />\n';

/**
 * .what = compiles the given files and returns each diagnostic that concerns the autoprune subpath
 * .why  = the prepare files also import peer-practice files absent from this dir; only the subpath
 *         diagnostics are this clamp's concern
 */
const getSubpathDiagnostics = (input: {
  rootNames: string[];
  lookup: 'node' | 'bundler';
}): { diagnostics: string[] } => {
  const program = ts.createProgram({
    rootNames: input.rootNames,
    options: {
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      esModuleInterop: true,
      target: ts.ScriptTarget.ESNext,
      types: [],
      ...(input.lookup === 'node'
        ? { moduleResolution: ts.ModuleResolutionKind.Node10 }
        : {
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
          }),
    },
  });
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    )
    .filter((message) => message.includes(SUBPATH));
  return { diagnostics };
};

describe('tests-expo autoprune subpath types', () => {
  given('[case1] the prepare templates with the reference line stripped', () => {
    when('[t0] compiled with moduleResolution node (expo sdk < 54)', () => {
      const result = useThen('the compile completes', async () => {
        // copy each prepare file into a temp dir that lacks the stand-in, minus the reference
        const dir = genTempDir({ slug: 'tests-expo-autoprune-unreferenced' });
        const rootNames = PREPARE_FILES.map((file) => {
          const copy = path.join(dir, path.basename(file));
          writeFileSync(copy, readFileSync(file, 'utf8').replace(REFERENCE_LINE, ''));
          return copy;
        });
        return getSubpathDiagnostics({ rootNames, lookup: 'node' });
      });

      then('the subpath is TS2307 — the defect the stand-in exists for', () => {
        expect(result.diagnostics.length).toEqual(PREPARE_FILES.length);
        expect(result.diagnostics[0]).toContain(`Cannot find module '${SUBPATH}'`);
      });
    });
  });

  given('[case2] the shipped prepare templates, as an adopter compiles them', () => {
    then('each prepare file carries the reference line', () => {
      for (const file of PREPARE_FILES)
        expect(readFileSync(file, 'utf8').startsWith(REFERENCE_LINE)).toEqual(true);
    });

    when('[t0] compiled with moduleResolution node (expo sdk < 54)', () => {
      const result = useThen('the compile completes', async () =>
        getSubpathDiagnostics({ rootNames: PREPARE_FILES, lookup: 'node' }),
      );

      then('the subpath types are found, with no diagnostic', () => {
        expect(result.diagnostics).toEqual([]);
      });
    });

    when('[t1] compiled with moduleResolution bundler (expo sdk 54+)', () => {
      const result = useThen('the compile completes', async () =>
        getSubpathDiagnostics({ rootNames: PREPARE_FILES, lookup: 'bundler' }),
      );

      then('the subpath types are found, with no diagnostic', () => {
        expect(result.diagnostics).toEqual([]);
      });
    });
  });
});
