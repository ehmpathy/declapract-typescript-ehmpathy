import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { given, then, when } from 'test-fns';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = clamps that the terraform pin `terraform-common` ships in `.terraform-version`
 *         satisfies every `required_version` constraint a best-practice `.tf` template declares.
 * .why  = the pin and the constraints ship from different practices into one adopter repo. a pin
 *         below a constraint is a self-contradiction: tfenv installs the pinned binary, and that
 *         binary refuses every root that declares the constraint (#600 — `0.14.11` against
 *         `>= 1.7`). a wrong number here goes red in this repo, never in an adopter.
 * .teeth = set `.terraform-version` back to `0.14.11` and case1 goes red with each offender.
 * .note = scope is `best-practice/` only; a bad-practice `.tf` is a pattern to detect, not a
 *         template that ships.
 */

const repoRoot = join(__dirname, '..');
const practicesDir = join(repoRoot, 'src/practices');
const pinPath = join(
  practicesDir,
  'terraform-common/best-practice/.terraform-version',
);

type VersionTuple = [number, number, number];

/**
 * .what = a dotted version string as a three-number tuple; absent parts read as zero
 */
const asVersionTuple = (input: { version: string }): VersionTuple => {
  const [major = 0, minor = 0, patch = 0] = input.version
    .trim()
    .split('.')
    .map((part) => Number.parseInt(part, 10));
  return [major, minor, patch];
};

/**
 * .what = the sign of (a - b) across a version tuple, leftmost part first
 */
const compareVersions = (a: VersionTuple, b: VersionTuple): number =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/**
 * .what = whether one version satisfies one terraform comparator (`>= 1.7`, `~> 1.9.0`, `1.9.8`)
 * .note = `~>` follows terraform: the rightmost declared part may increase, the rest must hold
 */
const isVersionInComparator = (input: {
  version: VersionTuple;
  comparator: string;
}): boolean => {
  const match = input.comparator.trim().match(/^(>=|<=|!=|~>|>|<|=)?\s*(.+)$/);
  if (!match) throw new Error(`unparsable comparator: ${input.comparator}`);
  const operator = match[1] ?? '=';
  const bound = asVersionTuple({ version: match[2] ?? '' });
  const diff = compareVersions(input.version, bound);
  if (operator === '>=') return diff >= 0;
  if (operator === '<=') return diff <= 0;
  if (operator === '>') return diff > 0;
  if (operator === '<') return diff < 0;
  if (operator === '!=') return diff !== 0;
  if (operator === '=') return diff === 0;
  const declaredParts = (match[2] ?? '').trim().split('.').length;
  const fixedParts = Math.max(declaredParts - 1, 1);
  const prefixHolds = input.version
    .slice(0, fixedParts)
    .every((part, index) => part === bound[index]);
  return prefixHolds && diff >= 0;
};

/**
 * .what = every `required_version = "..."` constraint inside one `.tf` source
 */
const getAllRequiredVersions = (input: { source: string }): string[] =>
  [...input.source.matchAll(/required_version\s*=\s*"([^"]+)"/g)].map(
    (match) => match[1] ?? '',
  );

describe('the terraform pin satisfies every required_version (#600)', () => {
  const pin = readFileSync(pinPath, 'utf8').trim();
  const constraints = getAllPathsUnderDir({
    dir: practicesDir,
    skip: PRACTICE_TREE_SKIP_DIRS,
  })
    .filter((path) => path.endsWith('.tf') && path.includes('/best-practice/'))
    .sort()
    .flatMap((path) =>
      getAllRequiredVersions({ source: readFileSync(path, 'utf8') }).map(
        (constraint) => ({ path: relative(repoRoot, path), constraint }),
      ),
    );

  given('[case0] the best-practice terraform templates', () => {
    when('[t0] their required_version constraints are collected', () => {
      then('at least one constraint is found, so the clamp is not vacuous', () => {
        expect(constraints.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case1] the .terraform-version pin', () => {
    when('[t0] it is checked against each constraint', () => {
      then('no constraint rejects the pin', () => {
        const version = asVersionTuple({ version: pin });
        const offenders = constraints
          .filter(
            ({ constraint }) =>
              !constraint
                .split(',')
                .every((comparator) =>
                  isVersionInComparator({ version, comparator }),
                ),
          )
          .map(({ path, constraint }) => `${path}: "${constraint}" rejects ${pin}`);
        expect(offenders).toEqual([]);
      });
    });
  });
});
