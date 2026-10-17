import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { genTempDir, given, then, when } from 'test-fns';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = two sweeps over every declaration every practice ships:
 *         1. no check can fail with no fix behind it, unless the gap is on the allowlist with its reason (#607)
 *         2. every custom fix is a fixed point on the declared input, and its own check settles on
 *            what it wrote: fix(fix(x)) === fix(x); a best-practice check passes on fix(x), and a
 *            bad-practice check no longer detects its pattern there (#536, #607)
 * .why  = when any failed check on a file has no fix, declapract marks the WHOLE file manual and
 *         applies none of its fixes, so one unfixable declaration silently blocks every other
 *         practice's fix on that file (#607). a fix that is not a fixed point rewrites a file on
 *         every apply, so `declapract apply` never converges (#536).
 * .teeth = drop the `fix` export from `lint/best-practice/.dpdmrc.yaml.declapract.ts` and case1
 *          goes red with that path; make the terraform-formatter fix append a key and case2 goes
 *          red with that path; make the bottleneck bad-practice fix return its input and case2 goes
 *          red with "the bad-practice check still detects on fix(x)".
 * .note = the fix of each declaration mirrors declapract's own getFileCheckDeclaration: a declared
 *         `fix` wins; else EQUALS (best-practice) writes the template, CONTAINS on a `.json` merges
 *         keys, CONTAINS on any other path writes only when the file is absent, EXISTS
 *         (bad-practice) deletes the file, and every other shape has no fix.
 */

const practicesDir = join(__dirname, 'practices');

type Purpose = 'best-practice' | 'bad-practice';

interface Declaration {
  practice: string;
  purpose: Purpose;
  /**
   * the dir the declared path is relative to (a best-practice dir, or one bad-practice dir)
   */
  root: string;
  /**
   * the declared path, relative to its root
   */
  path: string;
}

/**
 * .what = the shape of what a `.declapract.ts` module exports
 */
interface DeclarationModule {
  check?: unknown;
  fix?: unknown;
}

type FixFn = (
  contents: string | null,
  context: Record<string, unknown>,
) =>
  | Promise<{ contents?: string | null }>
  | { contents?: string | null };

type CheckFn = (
  contents: string | null,
  context: Record<string, unknown>,
) => unknown;

/**
 * .what = the declaration roots of a practice: its best-practice dir and each bad-practice dir
 */
const getAllDeclarationRoots = (input: {
  practice: string;
}): { purpose: Purpose; root: string }[] => {
  const best = join(practicesDir, input.practice, 'best-practice');
  const badDir = join(practicesDir, input.practice, 'bad-practices');
  const bestRoots = existsSync(best)
    ? [{ purpose: 'best-practice' as const, root: best }]
    : [];
  const badRoots = existsSync(badDir)
    ? readdirSync(badDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          purpose: 'bad-practice' as const,
          root: join(badDir, entry.name),
        }))
    : [];
  return [...bestRoots, ...badRoots];
};

/**
 * .what = every declaration in every practice, one per declared path
 * .note = mirrors declapract's read of a declaration dir: every file is a declaration except the
 *         root `.declapract.*` meta files and the `*.declapract.test.ts(.snap)` files compile strips.
 *         a `*.declapract.integration.test.ts` is a test too, so it is skipped here as well
 */
const getAllDeclarations = (): Declaration[] =>
  readdirSync(practicesDir)
    .sort()
    .flatMap((practice) =>
      getAllDeclarationRoots({ practice }).flatMap(({ purpose, root }) => {
        const paths = getAllPathsUnderDir({
          dir: root,
          skip: PRACTICE_TREE_SKIP_DIRS,
        })
          .map((path) => relative(root, path))
          .filter((path) => !/^\.declapract\./.test(path))
          .filter(
            (path) =>
              !/\.declapract\.(integration\.)?test\.ts(\.snap)?$/.test(path),
          )
          .map((path) => path.replace(/\.declapract\.ts$/, ''));
        return [...new Set(paths)]
          .sort()
          .map((path) => ({ practice, purpose, root, path }));
      }),
    );

/**
 * .what = the label a report uses for one declaration
 */
const asDeclarationLabel = (input: Declaration): string => {
  const where =
    input.purpose === 'best-practice'
      ? 'best-practice'
      : `bad-practices/${relative(join(practicesDir, input.practice, 'bad-practices'), input.root)}`;
  return `${input.practice} ${where}: ${input.path}`;
};

/**
 * .what = the `.declapract.ts` module of a declaration, or null where it has none
 */
const getDeclarationModule = (
  input: Declaration,
): DeclarationModule | null => {
  const modulePath = join(input.root, `${input.path}.declapract.ts`);
  if (!existsSync(modulePath)) return null;
  // require keeps the sweep synchronous, so one `then` reports every declaration at once
  return require(modulePath) as DeclarationModule;
};

/**
 * .what = the declared template contents, or null where the declaration ships none
 */
const getDeclaredContents = (input: Declaration): string | null => {
  const templatePath = join(input.root, input.path);
  if (!existsSync(templatePath)) return null;
  return readFileSync(templatePath, 'utf8');
};

/**
 * .what = the check type declapract assigns a declaration
 */
const getCheckType = (input: {
  module: DeclarationModule | null;
  contents: string | null;
}): string => {
  const check = input.module?.check;
  const fallback = input.contents !== null ? 'EQUALS' : 'EXISTS';
  if (check === undefined) return fallback;
  if (typeof check === 'function') return 'CUSTOM';
  if (typeof check === 'string') return check;
  const declared = check as { type?: string; function?: unknown };
  if (declared.function) return 'CUSTOM';
  return declared.type ?? fallback;
};

/**
 * .what = whether the declaration can fail with no fix that repairs a present file
 * .note = mirrors declapract's getFileCheckDeclaration fix choice (see header)
 */
const isUnfixable = (input: Declaration): boolean => {
  const module = getDeclarationModule(input);
  if (typeof module?.fix === 'function') return false;
  // an optional check passes on an absent file, so an EXISTS-optional check never fails
  const declaredCheck = module?.check as { optional?: boolean } | undefined;
  if (typeof declaredCheck === 'object' && declaredCheck?.optional === true)
    return false;
  const type = getCheckType({ module, contents: getDeclaredContents(input) });
  if (input.purpose === 'bad-practice') return type !== 'EXISTS';
  if (type === 'EQUALS') return false;
  if (type === 'CONTAINS') return !input.path.endsWith('.json');
  return true;
};

/**
 * .what = the declarations that may fail with no fix, each with the reason the gap is kept
 * .why  = each is a nudge that no fix can author (a file only the adopter can write, or a pattern
 *         only the adopter can rewrite); a new gap must be added here, with its reason, or fixed
 */
const ADOPTER_AUTHORED_TEST =
  'a nudge for a test only the adopter can author; no fix can write one';
const ADOPTER_ACCOUNT_IDS =
  'the right aws account id is known only to the adopter; a fix would guess it';
const ADOPTER_EXCLUSIONS =
  'CONTAINS over a file the adopter extends with its own entries; a rewrite would drop them';
const UNFIXABLE_BY_DESIGN: Record<string, string> = {
  'config bad-practices/configs-contain-wrong-account-id: config/prep.json':
    ADOPTER_ACCOUNT_IDS,
  'config bad-practices/configs-contain-wrong-account-id: config/prod.json':
    ADOPTER_ACCOUNT_IDS,
  'config bad-practices/configs-contain-wrong-account-id: config/test.json':
    ADOPTER_ACCOUNT_IDS,
  'config bad-practices/divergent-config-shapes: config/prep.json':
    'the shared shape across prep and prod configs is a choice only the adopter can make',
  'config bad-practices/divergent-config-shapes: config/prod.json':
    'the shared shape across prep and prod configs is a choice only the adopter can make',
  'dates-and-times bad-practices/moment: src/**/*.ts':
    'a moment migration rewrites call sites by hand; a dropped import breaks the build, so the flag lands on the importer for the adopter to migrate to iso-time',
  'directory-structure-src best-practice: src/contract/**/*.ts':
    'a nudge for the layer dirs only the adopter can fill with code',
  'directory-structure-src best-practice: src/domain.objects/**/*.ts':
    'a nudge for the layer dirs only the adopter can fill with code',
  'directory-structure-src best-practice: src/domain.operations/**/*.ts':
    'a nudge for the layer dirs only the adopter can fill with code',
  'domain best-practice: src/domain.objects/index.ts':
    'a nudge for the domain objects only the adopter can author',
  'persist-with-rds best-practice: provision/schema/sql/init.yml':
    ADOPTER_EXCLUSIONS,
  'tests-any best-practice: src/**/*.integration.test.ts': ADOPTER_AUTHORED_TEST,
  'tests-any best-practice: src/**/*.test.ts': ADOPTER_AUTHORED_TEST,
  'tests-any bad-practices/mocks: **/__mock__/*.js':
    'a mock must be rewritten into a real seam by the adopter; a fix cannot',
  'tests-any bad-practices/mocks: **/__mock__/*.ts':
    'a mock must be rewritten into a real seam by the adopter; a fix cannot',
  'tests-node best-practice: jest.unit.env.ts': ADOPTER_EXCLUSIONS,
  'tests-service best-practice: blackbox/**/*.acceptance.test.ts':
    ADOPTER_AUTHORED_TEST,
  'tests-service best-practice: blackbox/lambdas/*.acceptance.test.ts':
    ADOPTER_AUTHORED_TEST,
  'tests-service best-practice: src/**/*.integration.test.ts':
    ADOPTER_AUTHORED_TEST,
  'tests-service best-practice: src/**/*.test.ts': ADOPTER_AUTHORED_TEST,
};

/**
 * .what = swaps declapract's template expressions for plain values, as an adopter's apply would
 */
const asHydratedContents = (input: { contents: string }): string =>
  input.contents
    .replace(/@declapract\{check\.minVersion\('([^']+)'\)\}/g, '$1')
    .replace(/@declapract\{variable\.[^}]+\}/g, 'demo');

/**
 * .what = the first line of a thrown value, for a one-line report
 */
const asFailureMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error)
    return String(error.message).split('\n')[0] ?? '';
  return String(error);
};

/**
 * .what = runs one fix twice over one input and reports how it fell short, if it did
 */
const getFixFailures = async (input: {
  label: string;
  purpose: Purpose;
  fix: FixFn;
  check: CheckFn | null;
  contents: string | null;
  context: Record<string, unknown>;
}): Promise<string[]> => {
  try {
    const once = await input.fix(input.contents, input.context);
    const onceContents =
      once.contents === undefined ? input.contents : once.contents;
    const twice = await input.fix(onceContents, input.context);
    const twiceContents =
      twice.contents === undefined ? onceContents : twice.contents;
    const drift =
      twiceContents === onceContents
        ? []
        : [`${input.label}: fix(fix(x)) !== fix(x)`];
    // a fix may decline to author a file another practice owns (e.g. key order of package.json);
    // the check is held to the output only where the fix wrote one
    if (input.check && input.purpose === 'best-practice' && onceContents !== null)
      await input.check(onceContents, input.context);
    // a bad-practice check returns where it detects the pattern; on the fixed file it must throw,
    // or every apply flags the file again and the fix never settles
    const redetected =
      input.check && input.purpose === 'bad-practice'
        ? await getRedetection({
            label: input.label,
            check: input.check,
            contents: onceContents,
            context: input.context,
          })
        : [];
    return [...drift, ...redetected];
  } catch (error) {
    return [`${input.label}: ${asFailureMessage(error)}`];
  }
};

/**
 * .what = reports a bad-practice check that still detects its pattern on the fixed file
 * .why  = declapract reads ANY throw from a bad-practice check as "not detected", so this mirrors
 *         the engine: a return is the redetection, and every throw is the settled state
 */
const getRedetection = async (input: {
  label: string;
  check: CheckFn;
  contents: string | null;
  context: Record<string, unknown>;
}): Promise<string[]> => {
  try {
    await input.check(input.contents, input.context);
    return [`${input.label}: the bad-practice check still detects on fix(x)`];
  } catch {
    return []; // the check threw: the pattern is gone
  }
};

describe('every declaration has a fix that converges (#607, #536)', () => {
  const declarations = getAllDeclarations();

  given('[case0] every declaration in every practice', () => {
    then('declarations of both purposes are found, so the sweep is not vacuous', () => {
      const purposes = new Set(declarations.map(({ purpose }) => purpose));
      expect([...purposes].sort()).toEqual(['bad-practice', 'best-practice']);
    });
  });

  given('[case1] the fix of each declaration', () => {
    when('[t0] the declarations with no fix are listed', () => {
      const unfixable = declarations
        .filter(isUnfixable)
        .map(asDeclarationLabel);

      then('each is on the allowlist, with its reason', () => {
        expect(
          unfixable.filter((label) => !(label in UNFIXABLE_BY_DESIGN)),
        ).toEqual([]);
      });

      then('the allowlist names no declaration that has since gained a fix', () => {
        expect(
          Object.keys(UNFIXABLE_BY_DESIGN).filter(
            (label) => !unfixable.includes(label),
          ),
        ).toEqual([]);
      });
    });
  });

  given('[case2] every declared custom fix', () => {
    const projectRoot = genTempDir({ slug: 'practice-fix-coverage' });

    when('[t0] each fix runs on the absent file and on its own template', () => {
      then('check(fix(x)) settles and fix(fix(x)) === fix(x)', async () => {
        const failures: string[] = [];
        for (const declaration of declarations) {
          const module = getDeclarationModule(declaration);
          if (typeof module?.fix !== 'function') continue;
          const template = getDeclaredContents(declaration);
          const declaredFileContents =
            template === null ? null : asHydratedContents({ contents: template });
          const context = {
            declaredFileContents,
            relativeFilePath: declaration.path,
            projectPractices: [declaration.practice],
            projectVariables: {},
            getProjectRootDirectory: () => projectRoot,
          };
          // a best-practice check must pass on the fixed file; a bad-practice check must throw on it
          const check =
            typeof module.check === 'function' ? (module.check as CheckFn) : null;
          const inputs =
            declaration.purpose === 'best-practice'
              ? [null, declaredFileContents]
              : [declaredFileContents];
          for (const contents of inputs)
            failures.push(
              ...(await getFixFailures({
                label: `${asDeclarationLabel(declaration)} (input: ${contents === null ? 'absent' : 'template'})`,
                purpose: declaration.purpose,
                fix: module.fix as FixFn,
                check,
                contents,
                context,
              })),
            );
        }
        expect(failures).toEqual([]);
      });
    });
  });
});
