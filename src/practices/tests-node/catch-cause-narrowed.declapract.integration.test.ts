import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import ts from 'typescript';

/**
 * .what = clamps #632: the tests-node templates that rethrow inside a `catch` hand `cause` an
 *         `Error`, never the raw `unknown` the catch binds.
 * .why  = an adopter's tsconfig extends `@tsconfig/strictest`, which turns on
 *         `useUnknownInCatchVariables`. there a `catch (error)` binds `unknown`, and helpful-errors
 *         types `cause` as `Error | undefined` — so `{ cause: error }` fails the adopter's type check
 *         in a file the upgrade itself added. this repo never type-checks its `best-practice/`
 *         templates (its tsconfig includes only `*.declapract.ts`), so the defect shipped unseen.
 * .teeth = revert either site to `{ cause: error }` and its case reddens with TS2322.
 * .note = INTEGRATION: it reads the shipped templates off the filesystem and compiles them with the
 *         real typescript checker under the strictness flags an adopter carries. it sits at the
 *         practice root, so declapract never reads it as a declaration.
 */

const P = join(__dirname, 'best-practice');

const SITES = [
  { rel: 'src/.test/useKeyrack.ts', name: 'useKeyrack.ts' },
  { rel: 'jest.integration.env.db.ts', name: 'jest.integration.env.db.ts' },
];

/**
 * .what = type-check one template under adopter strictness; return the diagnostics that name `cause`.
 * .why  = the template imports packages this repo may not install (e.g. `rhachet/keyrack`), so an
 *         unresolved-import diagnostic is noise here; only an assignability error on the line that
 *         carries `cause` is the defect class under test.
 */
const getCauseDiagnostics = (input: { path: string }): string[] => {
  const program = ts.createProgram([input.path], {
    strict: true,
    useUnknownInCatchVariables: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    types: ['node'],
  });
  return ts
    .getPreEmitDiagnostics(program)
    .filter((diag) => diag.file?.fileName === input.path)
    .filter((diag) => {
      const line = diag.file!.getLineAndCharacterOfPosition(diag.start ?? 0).line;
      const text = diag.file!.text.split('\n')[line] ?? '';
      return text.includes('cause');
    })
    .map((diag) => ts.flattenDiagnosticMessageText(diag.messageText, '\n'));
};

describe('#632 a template catch narrows its cause to an Error', () => {
  for (const site of SITES) {
    given(`[case] ${site.name}`, () => {
      when('[t0] it is type-checked under strictest (useUnknownInCatchVariables)', () => {
        const diagnostics = useBeforeAll(async () => ({
          list: getCauseDiagnostics({ path: join(P, site.rel) }),
        }));

        then('no diagnostic lands on a `cause` line', () => {
          expect(diagnostics.list).toEqual([]);
        });
      });
    });
  }
});
