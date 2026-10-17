import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join, relative } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

import { getAllPracticesForUsecase } from './utils/getAllPracticesForUsecase';

/**
 * .what = clamps that, in every usecase, each bare package a best-practice `.ts` template imports
 *         is declared by a package.json of some practice in that same usecase.
 * .why  = a practice that ships `import … from 'simple-in-memory-cache'` while no practice in the
 *         usecase declares it emits a tree that does not compile for its adopter (#656: config's
 *         getConfig imported two cache packages that config never declared; the cache practice
 *         floors them `.ifInstalled()`, so no practice installed them). the dep may be owed by a
 *         peer practice (jest by tests-any, helpful-errors by errors) — what may never happen is
 *         that NO practice in the usecase owes it.
 * .scope = every usecase in src/useCases.yml, every practice it resolves (extends applied).
 * .teeth = drop `simple-in-memory-cache` from config/best-practice/package.json and every usecase
 *          that holds config reddens with `config: src/utils/config/getConfig.ts imports
 *          simple-in-memory-cache` in its gap list — cache's `.ifInstalled()` floor of it does not
 *          count, since a floor installs naught (the exact #656 gap).
 * .note = INTEGRATION by rule.forbid.unit.remote-boundaries: it walks the practice trees on disk.
 */

const PRACTICES_DIR = join(__dirname, 'practices');
const USECASES_YML_PATH = join(__dirname, 'useCases.yml');

/**
 * .what = list every `.ts` template under a best-practice dir (declarations excluded)
 * .why  = a `.declapract.ts` file is the declaration, never copied to an adopter
 */
const getAllTemplatePaths = (input: { dir: string }): string[] => {
  if (!existsSync(input.dir)) return [];
  return readdirSync(input.dir).flatMap((name) => {
    const path = join(input.dir, name);
    if (statSync(path).isDirectory()) return getAllTemplatePaths({ dir: path });
    if (!/\.tsx?$/.test(name)) return [];
    if (name.includes('.declapract.')) return [];
    return [path];
  });
};

/**
 * .what = cast an import specifier to its package name, or null when it names no package
 * .why  = relative paths, the `@src/` alias, and node builtins are no dependency
 */
const asPackageName = (input: { specifier: string }): string | null => {
  const { specifier } = input;
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  if (specifier.startsWith('@src/') || specifier.startsWith('node:')) return null;
  const parts = specifier.split('/');
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
  if (builtinModules.includes(name)) return null;
  return name;
};

/**
 * .what = list the package names a template imports, from its import/export statements only
 * .why  = a bare `from '<x>'` scan also reads prose (`a role from 'bad password'`) as an import
 */
const getAllImportedPackages = (input: { source: string }): string[] =>
  [
    ...input.source.matchAll(
      /^\s*(?:import|export)\b[^'"`;]*?\bfrom\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm,
    ),
  ]
    .map((match) => asPackageName({ specifier: (match[1] ?? match[2])! }))
    .filter((name): name is string => name !== null);

/**
 * .what = list the package names a practice's package.json declares (any dep section), from its
 *         template and from the deps its `package.json.declapract.ts` writes by key
 * .why  = a practice may declare its deps in code with no template file (tests-expo writes
 *         `devDependencies['isomorphic-fetch'] = '^3.0.0'`)
 * .note = the code scan reads `<x>Dependencies['<name>']` keys: it may count a dep the fix only
 *         reads, which loosens the clamp, never a false red
 */
const getAllDeclaredPackages = (input: { practice: string }): string[] => {
  const templatePath = join(PRACTICES_DIR, input.practice, 'best-practice/package.json');
  const declarationPath = `${templatePath}.declapract.ts`;
  const parsed = existsSync(templatePath)
    ? (JSON.parse(readFileSync(templatePath, 'utf8')) as Record<
        string,
        Record<string, string>
      >)
    : {};
  const writtenByCode = existsSync(declarationPath)
    ? [
        ...readFileSync(declarationPath, 'utf8').matchAll(
          /[dD]ependencies\[\s*['"]([^'"]+)['"]\s*\]/g,
        ),
      ].map((match) => match[1]!)
    : [];
  // an `.ifInstalled()` floor raises a dep a repo already has and installs none, so it owes naught
  const installed = (section: Record<string, string> | undefined): string[] =>
    Object.entries(section ?? {})
      .filter(([, version]) => !version.includes('.ifInstalled()'))
      .map(([name]) => name);
  return [
    ...installed(parsed.dependencies),
    ...installed(parsed.devDependencies),
    ...installed(parsed.peerDependencies),
    ...writtenByCode,
  ];
};

/**
 * .what = list `<practice>: <template> imports <package>` per import that no practice in the set declares
 */
const getAllImportGaps = (input: { practices: string[] }): string[] => {
  const declared = new Set(
    input.practices.flatMap((practice) => getAllDeclaredPackages({ practice })),
  );
  const gaps = input.practices.flatMap((practice) => {
    const dir = join(PRACTICES_DIR, practice, 'best-practice');
    return getAllTemplatePaths({ dir }).flatMap((path) =>
      getAllImportedPackages({ source: readFileSync(path, 'utf8') })
        .filter((name) => !declared.has(name))
        .map((name) => `${practice}: ${relative(dir, path)} imports ${name}`),
    );
  });
  return [...new Set(gaps)].sort();
};

const USECASES = Object.keys(
  yaml.parse(readFileSync(USECASES_YML_PATH, 'utf-8'))['use-cases'],
).sort();

describe('every bare import in a best-practice template is declared within its usecase', () => {
  given('[case0] the import scan itself', () => {
    when('[t0] statements and prose are read', () => {
      then('it reads import statements, and never a prose `from`', () => {
        expect(
          getAllImportedPackages({
            source: [
              "import { a } from 'pkg-a';",
              'import {',
              '  b,',
              "} from '@scope/pkg-b/deep';",
              "import 'pkg-c';",
              "export { d } from 'pkg-d';",
              "import x from './local';",
              "import y from 'node:fs';",
              "  // a role from 'bad password' is refused",
              "throw new Error(`denied from 'psql absent'`);",
            ].join('\n'),
          }).sort(),
        ).toEqual(['@scope/pkg-b', 'pkg-a', 'pkg-c', 'pkg-d']);
      });
    });
  });

  USECASES.forEach((usecase) => {
    given(`[case] the ${usecase} usecase`, () => {
      const scene = useBeforeAll(() => ({
        gaps: getAllImportGaps({
          practices: getAllPracticesForUsecase({
            usecasesYmlPath: USECASES_YML_PATH,
            usecase,
          }),
        }),
      }));

      when('[t0] each template import is checked against the usecase package.json set', () => {
        then('no template imports a package that no practice in the usecase declares', () => {
          expect(scene.gaps).toEqual([]);
        });
      });
    });
  });
});
