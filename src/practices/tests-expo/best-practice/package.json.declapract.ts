import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';

import { asPackageJSON } from '../../../utils/asPackageJSON';

/**
 * .what = the expo half of the tests triad: the jest-expo transform stack that replaces
 *         node's `@swc/jest`. this check GATES the SDK-coupled majors on the repo's OWN
 *         expo + react majors, rather than floor them at a fixed baseline.
 * .why  = jest-expo's preset pokes react internals of the SDK it targets. a fixed
 *         `minVersion('54.0.0')` floor forces jest-expo 54 (a react-19-era preset) onto an
 *         expo-51 / react-18 repo, and every unit suite throws
 *         `TypeError: Object.defineProperty called on non-object` at jest-expo's preset setup
 *         (#584 / defect D1). the two crashing deps each track a major 1:1:
 *           - jest-expo major  == expo major  (jest-expo 54 pairs with expo 54)
 *           - react-test-renderer major == react major (rtr ships lockstep with react)
 *         so the gate reads the repo's OWN expo + react majors and requires a match — which
 *         holds jest-expo at 51 on an expo-51 repo and at 54 on an expo-54 repo, with no
 *         version table to rot as new SDKs ship.
 * .note = @babel/core + babel-preset-expo + isomorphic-fetch stay MINIMA (not the crash; each a
 *         plain floor the pre-gate template already declared). babel-preset-expo also tracks the
 *         SDK, but backward-compatibly; its floor is left as a residual — see .deliver/584.md.
 * .note = a repo with no `expo` dep is not an expo repo in a gate-able state; the check passes
 *         (returns) rather than flags, so a non-expo package.json is never falsely reddened.
 */

const BABEL_CORE_MIN = { major: 7, minor: 24, patch: 0 };
const BABEL_PRESET_EXPO_MIN = { major: 12, minor: 0, patch: 0 };
const ISOMORPHIC_FETCH_MIN = { major: 3, minor: 0, patch: 0 };

interface SemverTriple {
  major: number;
  minor: number;
  patch: number;
}

/** parse the leading `major.minor.patch` out of a semver range (`^54.0.0`, `~19.1.2`, `>=3.0.0`). */
const parseVersionTriple = (range: string | undefined): SemverTriple | null => {
  if (!range) return null;
  const match = range.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};

const majorOf = (range: string | undefined): number | null =>
  parseVersionTriple(range)?.major ?? null;

const meetsMinimum = (
  range: string | undefined,
  min: SemverTriple,
): boolean => {
  const found = parseVersionTriple(range);
  if (!found) return false;
  if (found.major !== min.major) return found.major > min.major;
  if (found.minor !== min.minor) return found.minor > min.minor;
  return found.patch >= min.patch;
};

/** the subset of a package.json this declaration reads + rewrites (dep maps), typed rather than `any`. */
interface PackageJSON {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const getAllDeps = (packageJSON: PackageJSON): Record<string, string> => ({
  ...(packageJSON.dependencies ?? {}),
  ...(packageJSON.devDependencies ?? {}),
});

export const check: FileCheckFunction = (contents) => {
  // no file → no gate to enforce; a best-practice check passes (returns) when clean
  if (!contents) return;

  const packageJSON: PackageJSON = asPackageJSON(
    { contents },
    {
      practice: 'tests-expo',
    },
  );
  const deps = getAllDeps(packageJSON);

  // a repo with no `expo` dep is not an expo repo in a gate-able state — do not flag it
  const expoMajor = majorOf(deps.expo);
  if (expoMajor === null) return;

  // jest-expo major must MATCH the repo's expo major (jest-expo tracks the SDK 1:1)
  const jestExpoMajor = majorOf(deps['jest-expo']);
  if (jestExpoMajor !== expoMajor)
    throw new ConstraintError(
      `jest-expo major (${jestExpoMajor}) must match the repo's expo major (${expoMajor}) — run \`declapract apply\` to pin jest-expo to ^${expoMajor}.0.0`,
      { found: jestExpoMajor, required: expoMajor, dep: 'jest-expo' },
    );

  // react-test-renderer major must MATCH the repo's react major (rtr ships lockstep with react)
  const reactMajor = majorOf(deps.react);
  if (reactMajor !== null) {
    const rtrMajor = majorOf(deps['react-test-renderer']);
    if (rtrMajor !== reactMajor)
      throw new ConstraintError(
        `react-test-renderer major (${rtrMajor}) must match the repo's react major (${reactMajor}) — run \`declapract apply\` to pin react-test-renderer to ^${reactMajor}.0.0`,
        { found: rtrMajor, required: reactMajor, dep: 'react-test-renderer' },
      );
  }

  // @babel/core + babel-preset-expo + isomorphic-fetch stay MINIMA (not the crash; a plain
  // floor, exactly as the pre-gate template declared each of the three)
  if (!meetsMinimum(deps['@babel/core'], BABEL_CORE_MIN))
    throw new ConstraintError(
      '@babel/core must be >= 7.24.0 — run `declapract apply` to raise it',
      {
        found: deps['@babel/core'] ?? null,
        required: '7.24.0',
        dep: '@babel/core',
      },
    );
  if (!meetsMinimum(deps['babel-preset-expo'], BABEL_PRESET_EXPO_MIN))
    throw new ConstraintError(
      'babel-preset-expo must be >= 12.0.0 — run `declapract apply` to raise it',
      {
        found: deps['babel-preset-expo'] ?? null,
        required: '12.0.0',
        dep: 'babel-preset-expo',
      },
    );
  if (!meetsMinimum(deps['isomorphic-fetch'], ISOMORPHIC_FETCH_MIN))
    throw new ConstraintError(
      'isomorphic-fetch must be >= 3.0.0 — run `declapract apply` to raise it',
      {
        found: deps['isomorphic-fetch'] ?? null,
        required: '3.0.0',
        dep: 'isomorphic-fetch',
      },
    );

  // all gates satisfied
  return;
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJSON: PackageJSON = asPackageJSON(
    { contents },
    {
      practice: 'tests-expo',
    },
  );
  const deps = getAllDeps(packageJSON);
  const expoMajor = majorOf(deps.expo);

  // no expo dep → not a gate-able expo repo; leave untouched
  if (expoMajor === null) return { contents };

  const devDependencies = { ...(packageJSON.devDependencies ?? {}) };
  const dependencies = { ...(packageJSON.dependencies ?? {}) };

  // jest-expo + react-test-renderer are test-time deps that belong in devDependencies ALONE. pin
  // them there AND delete any copy under `dependencies` — else the merged getAllDeps check (dev
  // wins) reads green while npm installs ONE version and a stale `dependencies` copy at a conflicting
  // major can win at install time (the two-section version conflict r006.b1 forbids). the sibling
  // dep declarations (logs/leveled-term, rhachet/prod-deps) strip from both sections for the same reason.
  devDependencies['jest-expo'] = `^${expoMajor}.0.0`;
  delete dependencies['jest-expo'];

  // pin react-test-renderer to the repo's react major, when a react dep is present
  const reactMajor = majorOf(deps.react);
  if (reactMajor !== null) {
    devDependencies['react-test-renderer'] = `^${reactMajor}.0.0`;
    delete dependencies['react-test-renderer'];
  }

  // raise @babel/core + babel-preset-expo + isomorphic-fetch to their minima when below
  if (!meetsMinimum(deps['@babel/core'], BABEL_CORE_MIN))
    devDependencies['@babel/core'] = '^7.24.0';
  if (!meetsMinimum(deps['babel-preset-expo'], BABEL_PRESET_EXPO_MIN))
    devDependencies['babel-preset-expo'] = '^12.0.0';
  if (!meetsMinimum(deps['isomorphic-fetch'], ISOMORPHIC_FETCH_MIN))
    devDependencies['isomorphic-fetch'] = '^3.0.0';

  // preserve each section's presence: rewrite `dependencies` ONLY when the manifest already declared
  // one (so a repo with no prod deps never gains an empty `dependencies: {}` it did not have).
  const result: PackageJSON = { ...packageJSON, devDependencies };
  if (packageJSON.dependencies) result.dependencies = dependencies;

  return {
    contents: JSON.stringify(result, null, 2),
  };
};
