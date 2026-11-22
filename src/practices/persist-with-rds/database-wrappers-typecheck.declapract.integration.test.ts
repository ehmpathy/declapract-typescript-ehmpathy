import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import ts from '@typescript/typescript6';

import { getAllDiagnosticsFromTscBinary } from '../../.test/getAllDiagnosticsFromTscBinary';

/**
 * .what = type-checks the SHIPPED `withDatabaseTransaction` + `withDatabaseContext` templates, and
 *         the callers an adopter writes over them, under the strictest options the typescript
 *         practice emits — the verdict for #627 and #633.
 * .why  = a template the practice emits must compile where it lands. #627: the transaction wrapper
 *         declared `Promise<Awaited<R>>`, which its own body cannot reach for an unconstrained `R`
 *         (`await` of a bare generic types as `R`), so tsc failed inside the practice-owned file on
 *         every adopter. #633: the context wrapper's jsdoc example showed a call that does not
 *         compile. both defects live in bytes no adopter may edit (the next apply re-emits them),
 *         so the only place to catch them is here, before they ship.
 * .teeth = put `Promise<Awaited<R>>` back on the transaction wrapper and the "zero diagnostics"
 *          assertion reddens with TS2322 inside withDatabaseTransaction.ts (both bodies). put the
 *          one-arg `findById({ id: 821 })` back into the jsdoc example and the example fixture
 *          reddens (TS2554 + TS2322).
 * .note = the fixture holds BOTH transaction bodies — the practice's (context passed through) and
 *         the one #627 quotes (a fresh context spread into `logic`) — and three callers: an async
 *         op, a sync op, and a generic op. `getOneDatabaseConnection` is stubbed so no `pg` types
 *         are needed. INTEGRATION by `rule.forbid.unit.remote-boundaries`: it reads the shipped
 *         templates off the filesystem. it sits at the practice ROOT, so declapract never emits it.
 */

const TEMPLATE_DIR = join(__dirname, 'best-practice/src/utils/database');
const FIXTURE_DIR = '/fixture/src/utils/database';

// the strictest options the typescript-node practice emits (@tsconfig/strictest + its overrides)
const COMPILER_OPTIONS: ts.CompilerOptions = {
  strict: true,
  noUncheckedIndexedAccess: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  allowUnusedLabels: false,
  allowUnreachableCode: false,
  noPropertyAccessFromIndexSignature: false,
  exactOptionalPropertyTypes: false,
  noUnusedLocals: false,
  noUnusedParameters: false,
  target: ts.ScriptTarget.ES2020,
  lib: ['lib.es2020.d.ts'],
  module: ts.ModuleKind.Node16,
  moduleResolution: ts.ModuleResolutionKind.Node16,
  types: [],
  noEmit: true,
};

// the same options in tsconfig form, for the installed typescript 7 binary
const TSCONFIG_OPTIONS = {
  strict: true,
  noUncheckedIndexedAccess: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  allowUnusedLabels: false,
  allowUnreachableCode: false,
  noPropertyAccessFromIndexSignature: false,
  exactOptionalPropertyTypes: false,
  noUnusedLocals: false,
  noUnusedParameters: false,
  target: 'es2020',
  lib: ['es2020'],
  module: 'node16',
  moduleResolution: 'node16',
  types: [],
  noEmit: true,
};

/**
 * .what = type-check the same fixture with the installed typescript 7 binary
 * .why = adopters compile these templates with typescript 7, not the 6.0 checker above
 */
const getDiagnosticsFromTsc7 = (input: { slug: string; files: Record<string, string> }) => {
  const files = Object.fromEntries(
    Object.entries(input.files).map(([path, source]) => [path.replace('/fixture/', ''), source]),
  );
  const checked = getAllDiagnosticsFromTscBinary({
    slug: input.slug,
    files,
    roots: Object.keys(files),
    compilerOptions: TSCONFIG_OPTIONS,
  });
  return {
    version: checked.version,
    lines: checked.diagnostics.map((found) => `${found.file}:${found.line} ${found.code}: ${found.message}`),
  };
};

/**
 * .what = the stub that stands in for the pg-backed connection factory
 * .why = the wrappers import only the `DatabaseConnection` type and the factory fn; a stub keeps
 *        the fixture free of `pg` while the shape the wrappers see stays the real one
 */
const STUB_CONNECTION = `
export interface DatabaseConnection {
  query: <Row>(args: { sql: string; values?: unknown[] }) => Promise<{ rows: Row[] }>;
  end: () => Promise<void>;
}
export const getOneDatabaseConnection = async (): Promise<DatabaseConnection> => {
  throw new Error('stub: no database in a type-check fixture');
};
`;

/**
 * .what = the callers an adopter writes over the transaction wrapper: async, sync, and generic
 * .why = each pins what the wrapper must return; a wrong declared return reddens here or in the
 *        wrapper itself
 */
const asTransactionCallers = (input: { wrapperModule: string }): string => `
import type { DatabaseConnection } from './getOneDatabaseConnection';
import { withDatabaseTransaction } from './${input.wrapperModule}';

declare const context: { dbConnection: DatabaseConnection };

// an async op: the wrapper hands back a promise of the resolved value
const setSurfLesson = withDatabaseTransaction(
  async (input: { uuid: string }, context: { dbConnection: DatabaseConnection }) => {
    await context.dbConnection.query({ sql: 'select 1' });
    return { uuid: input.uuid };
  },
);
export const lessonSet: Promise<{ uuid: string }> = setSurfLesson({ uuid: 'x' }, context);

// a sync op: the wrapper is always async, so the caller sees a promise back
const getWaveCount = withDatabaseTransaction(
  (input: { waves: string[] }, _context: { dbConnection: DatabaseConnection }) => input.waves.length,
);
export const waveCount: Promise<number> = getWaveCount({ waves: [] }, context);

// a generic op: the wrapper keeps the caller's type parameter
export const getEcho = async <T>(input: { value: T }): Promise<T> =>
  withDatabaseTransaction(
    async (inner: { value: T }, _context: { dbConnection: DatabaseConnection }) => inner.value,
  )(input, context);
`;

/**
 * .what = the example code block inside a template's jsdoc, unwrapped from its ` * ` gutter
 * .why = the example is a claim about the template's own contract; it must compile like any caller
 */
const asJsdocExample = (input: { source: string }): string => {
  const block = input.source.match(/```\n([\s\S]*?)\n\s*\*\s*```/)?.[1];
  if (!block) throw new Error('no ``` example block found in the jsdoc');
  return block
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, ''))
    .join('\n');
};

/**
 * .what = type-check a set of in-memory fixture files and return each diagnostic as one line
 * .why = an in-memory host overlays the fixture on the real lib files, so the check needs no disk
 *        writes and no tsconfig of its own
 */
const getDiagnostics = (input: { files: Record<string, string> }): string[] => {
  const host = ts.createCompilerHost(COMPILER_OPTIONS);
  const readFileBase = host.readFile.bind(host);
  const getSourceFileBase = host.getSourceFile.bind(host);
  const fileExistsBase = host.fileExists.bind(host);
  host.fileExists = (fileName) =>
    fileName in input.files || fileExistsBase(fileName);
  host.directoryExists = (directoryName) =>
    FIXTURE_DIR.startsWith(directoryName) ||
    ts.sys.directoryExists(directoryName);
  host.readFile = (fileName) => input.files[fileName] ?? readFileBase(fileName);
  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const fixture = input.files[fileName];
    if (fixture !== undefined)
      return ts.createSourceFile(fileName, fixture, languageVersion, true);
    return getSourceFileBase(fileName, languageVersion, ...rest);
  };
  const program = ts.createProgram({
    rootNames: Object.keys(input.files),
    options: COMPILER_OPTIONS,
    host,
  });
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const where = diagnostic.file
      ? `${diagnostic.file.fileName.replace(`${FIXTURE_DIR}/`, '')}:${
          diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
            .line + 1
        }`
      : '(global)';
    return `${where} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
  });
};

describe('persist-with-rds database wrappers type-check where they land (#627, #633)', () => {
  const transactionTemplate = readFileSync(
    join(TEMPLATE_DIR, 'withDatabaseTransaction.ts'),
    'utf8',
  );
  const contextTemplate = readFileSync(
    join(TEMPLATE_DIR, 'withDatabaseContext.ts'),
    'utf8',
  );

  // the body #627 quotes: a fresh context spread into `logic`, under the shipped declaration
  const transactionIssueBody = transactionTemplate.replace(
    'await logic(input, context)',
    'await logic(input, { ...context, dbConnection: context.dbConnection })',
  );

  given('[case1] an adopter with an async, a sync, and a generic op wrapped in withDatabaseTransaction', () => {
    const files = {
      [`${FIXTURE_DIR}/getOneDatabaseConnection.ts`]: STUB_CONNECTION,
      [`${FIXTURE_DIR}/withDatabaseTransaction.ts`]: transactionTemplate,
      [`${FIXTURE_DIR}/withDatabaseTransactionIssueBody.ts`]: transactionIssueBody,
      [`${FIXTURE_DIR}/callersOfPracticeBody.ts`]: asTransactionCallers({
        wrapperModule: 'withDatabaseTransaction',
      }),
      [`${FIXTURE_DIR}/callersOfIssueBody.ts`]: asTransactionCallers({
        wrapperModule: 'withDatabaseTransactionIssueBody',
      }),
    };

    when('[t0] tsc runs over the practice body and the body #627 quotes', () => {
      const diagnostics = useBeforeAll(async () => ({ lines: getDiagnostics({ files }) }));

      then('the issue body differs from the practice body (both bodies are under test)', () => {
        expect(transactionIssueBody).not.toEqual(transactionTemplate);
      });

      then('no diagnostic points into the wrapper or its callers', () => {
        expect(diagnostics.lines).toEqual([]);
      });
    });

    when('[t1] the installed typescript 7 binary runs over the same files', () => {
      const checked = useBeforeAll(async () =>
        getDiagnosticsFromTsc7({ slug: 'database-wrappers-tsc7-transaction', files }),
      );

      then('typescript 7 finds no diagnostic in the wrapper or its callers', () => {
        expect(checked.version).toMatch(/Version 7\./);
        expect(checked.lines).toEqual([]);
      });
    });
  });

  given('[case2] the jsdoc example that withDatabaseContext ships', () => {
    const example = asJsdocExample({ source: contextTemplate });
    const files = {
      [`${FIXTURE_DIR}/getOneDatabaseConnection.ts`]: STUB_CONNECTION,
      [`${FIXTURE_DIR}/withDatabaseContext.ts`]: contextTemplate,
      [`${FIXTURE_DIR}/example.ts`]: [
        "import type { DatabaseConnection } from './getOneDatabaseConnection';",
        "import { withDatabaseContext } from './withDatabaseContext';",
        '// the connection the example reuses, as an adopter inside a transaction holds it',
        'declare const dbConnection: DatabaseConnection;',
        'export const run = async (): Promise<void> => {',
        example,
        '};',
      ].join('\n'),
    };

    when('[t0] tsc runs over the example, as an adopter would paste it', () => {
      const diagnostics = useBeforeAll(async () => ({ lines: getDiagnostics({ files }) }));

      then('the example compiles', () => {
        expect(diagnostics.lines).toEqual([]);
      });

      then('the example calls withDatabaseContext, and matches snapshot', () => {
        expect(example).toContain('withDatabaseContext');
        expect(example).toMatchSnapshot('withDatabaseContext jsdoc example');
      });
    });

    when('[t1] the installed typescript 7 binary runs over the example', () => {
      const checked = useBeforeAll(async () =>
        getDiagnosticsFromTsc7({ slug: 'database-wrappers-tsc7-example', files }),
      );

      then('typescript 7 compiles the example', () => {
        expect(checked.version).toMatch(/Version 7\./);
        expect(checked.lines).toEqual([]);
      });
    });
  });
});
