import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';
import yaml from 'yaml';

import { getAllPracticesForUsecase } from './utils/getAllPracticesForUsecase';

/**
 * .what = clamps #672 across every practice: a package command a practice declares calls the bin
 *         of a declared dep by its bare name, never through `npx`. a dep counts as declared when the
 *         practice itself declares it, or a practice that every usecase which holds it also holds.
 * .why  = under `pnpm run`, pnpm exports its own settings as `npm_config_*` vars; `npx` is npm, so
 *         it reads them and prints an `Unknown env config` warn above every command. a package command
 *         already has `node_modules/.bin` on its PATH, so the bare bin finds the pinned dep — and
 *         fails loud when the dep is absent, where `npx` would fetch one from the registry.
 * .teeth = put `npx ` back in front of any declared bin (e.g. `npx sls prune` in serverless, or
 *          `npx sql-schema-control plan` in persist-with-rds) and case1 reddens with the practice,
 *          the command, and the bin named. add an `npx <bin>` whose package no co-held practice
 *          declares, with no reason on record, and case2 reddens.
 * .note = each subject is a shipped TEMPLATE (a CONTAINS check on package.json). declapract's json
 *         fix replaces a mismatched string value in place, so an adopter's extant `npx x` command is
 *         flagged by the check and rewritten by the next apply — it converges, never sticks.
 */

const repoRoot = join(__dirname, '..');
const practicesDir = join(repoRoot, 'src/practices');
const usecasesYmlPath = join(repoRoot, 'src/useCases.yml');

/**
 * .what = the package that provides each bin a template calls through npx
 * .why  = a bin name and its package name often differ (`sls` from serverless, `cz` from
 *         commitizen), so the clamp needs the map to know whether the bin's package is declared
 */
const PACKAGE_BY_BIN: Record<string, string> = {
  sls: 'serverless',
  serverless: 'serverless',
  'sdk-environment': 'sdk-environment',
  expo: 'expo',
  'dynamodb-dao-generator': 'dynamodb-dao-generator',
  'simple-artifact-builder': 'simple-artifact-builder',
  'sql-schema-control': 'sql-schema-control',
  cz: 'commitizen',
  commitlint: '@commitlint/cli',
  depcheck: 'depcheck',
  'wait-on': 'wait-on',
  'local-ssl-proxy': 'local-ssl-proxy',
  serve: 'serve',
  eas: 'eas-cli',
};

/**
 * .what = each bin a template may still call through npx, with the reason it stays
 * .why  = an npx call is only correct where no co-held practice declares the bin's package; the
 *         reason is the record of that decision, so a later reader need not re-derive it
 */
const NPX_KEPT_BY_BIN: Record<string, string> = {
  cz: 'conventional-commits declares cz-conventional-changelog (the adapter), not commitizen (the cz bin); pnpm links no transitive bin into node_modules/.bin',
  'local-ssl-proxy':
    'cicd-app-react-native-expo declares no local-ssl-proxy; npx fetches it on demand for a local dev proxy',
  serve:
    'cicd-app-react-native-expo declares no serve; npx fetches it on demand for a local preview of dist',
  eas: 'cicd-app-react-native-expo declares no eas-cli; eas is an expo-hosted cli, fetched by npx (or a global install)',
};

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

/**
 * .what = one practice's best-practice package.json, or null where it declares none
 */
const getOnePracticePackageJson = (input: {
  practice: string;
}): PackageJson | null => {
  const path = join(practicesDir, input.practice, 'best-practice/package.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
};

/**
 * .what = the practices that every usecase which holds this practice also holds (itself included)
 * .why  = a dep declared by a co-held practice is present in every repo that runs this command
 */
const getAllCoHeldPractices = (input: {
  practice: string;
  usecases: string[];
}): string[] => {
  const holders = input.usecases
    .map((usecase) => getAllPracticesForUsecase({ usecasesYmlPath, usecase }))
    .filter((practices) => practices.includes(input.practice));
  if (!holders.length) return [input.practice];
  return holders.reduce((shared, practices) =>
    shared.filter((practice) => practices.includes(practice)),
  );
};

/**
 * .what = the dep names a set of practices declare, across dependencies and devDependencies
 */
const getAllDeclaredDeps = (input: { practices: string[] }): string[] =>
  input.practices.flatMap((practice) => {
    const pkg = getOnePracticePackageJson({ practice });
    return [
      ...Object.keys(pkg?.dependencies ?? {}),
      ...Object.keys(pkg?.devDependencies ?? {}),
    ];
  });

/**
 * .what = the bins a command calls through npx, e.g. `npx sls prune` → ['sls']
 */
const getAllNpxBins = (input: { command: string }): string[] =>
  [...input.command.matchAll(/(?:^|[\s(;&|])npx ([@\w./-]+)/g)].map(
    (match) => match[1]!,
  );

describe('package commands call declared bins bare, across every practice (#672)', () => {
  const usecases = Object.keys(
    yaml.parse(readFileSync(usecasesYmlPath, 'utf8'))['use-cases'],
  );
  const npxCalls = readdirSync(practicesDir).flatMap((practice) => {
    const pkg = getOnePracticePackageJson({ practice });
    if (!pkg) return [];
    const declaredDeps = getAllDeclaredDeps({
      practices: getAllCoHeldPractices({ practice, usecases }),
    });
    return Object.entries(pkg.scripts ?? {}).flatMap(([commandName, command]) =>
      getAllNpxBins({ command }).map((bin) => ({
        practice,
        commandName,
        bin,
        declared: declaredDeps.includes(PACKAGE_BY_BIN[bin] ?? bin),
      })),
    );
  });

  given('[case1] an npx call whose package a co-held practice declares', () => {
    when('every shipped package.json template is read', () => {
      then('no command calls a declared bin through npx', () => {
        const offenders = npxCalls.filter((call) => call.declared);
        expect(offenders).toEqual([]);
      });
    });
  });

  given('[case2] an npx call whose package no co-held practice declares', () => {
    when('every shipped package.json template is read', () => {
      then('each such bin is on record with the reason it stays npx', () => {
        const unrecorded = npxCalls.filter(
          (call) => !call.declared && !NPX_KEPT_BY_BIN[call.bin],
        );
        expect(unrecorded).toEqual([]);
      });
    });
  });

  given('[case3] the persist-with-rds provision:schema commands', () => {
    const pkg = getOnePracticePackageJson({ practice: 'persist-with-rds' });
    when('the template is read', () => {
      then('they call sql-schema-control bare', () => {
        expect(pkg?.scripts?.['provision:schema:plan']).toEqual(
          'sql-schema-control plan -c provision/schema/control.yml',
        );
        expect(pkg?.scripts?.['provision:schema:apply']).toEqual(
          'sql-schema-control apply -c provision/schema/control.yml',
        );
        expect(pkg?.scripts?.['provision:schema:sync']).toEqual(
          'sql-schema-control sync -c provision/schema/control.yml',
        );
      });
    });
  });
});
