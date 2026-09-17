import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = a structural ratchet over every `package.json.declapract.ts` declaration: each one that
 *         reads a consumer `package.json` off the `contents` arg must parse it through
 *         `asPackageJSON`, not a raw `JSON.parse(contents)`. the ratchet holds the CURRENT
 *         unconverted set to an allowlist, so the count only ever falls — a new declaration cannot
 *         add a raw parse OF `contents` off the allowlist, and a converted one must drop from the
 *         allowlist (D50 / #571).
 * .bound = the ledger's teeth are keyed to the `contents` parameter name and to self-consistency
 *          within ONE run. two gaps follow, both benign at today's instances and named here so the
 *          claim above is not read wider than it holds: (1) a declaration that parses the consumer
 *          `package.json` off a differently-named var is not matched — the ratchet reads the
 *          `contents` arg, the canonical name for that arg in a `FileCheckFunction`/`FileFixFunction`
 *          signature, so an off-name parse of the SAME input evades it (a `FileContentsFunction` that
 *          parses config or its own template package.json, as `tests-service` does, is NOT this debt
 *          — it never reads the consumer's package.json). (2) the compare is intra-run only: a diff
 *          that adds a raw parse AND its allowlist row together passes, since there is no baseline
 *          diff against `origin/main`. to widen either is a value-emitter change gated behind a
 *          same-store/same-input discriminant (a differently-named parse of an unrelated input must
 *          not false-positive) — a follow-on, not a claim this ledger makes today.
 * .why  = a raw `JSON.parse(contents)` throws a context-free engine `SyntaxError` that names no
 *         practice, no dependency, no file, and no remedy (see `asPackageJSON`). the verbal note
 *         "route every parse through the util" decayed across three review rounds as a memory rather
 *         than a test; a memory does not redden when a 27th declaration adds a raw parse. this turns
 *         the note into a gate: the allowlist is the debt ledger, and it can only shrink.
 * .note = this is an INTEGRATION test by the same rule its kin walks cite (`errors`, `domain`,
 *         `actionPins`): it reads the filesystem — `readdirSync` over the practice tree,
 *         `readFileSync` on every declaration — and `rule.forbid.unit.remote-boundaries` puts any
 *         test that crosses that boundary in the integration suite. no credential, no network; the
 *         boundary alone classifies it.
 * .teeth = the "no NEW unconverted" case is the sharp one: it reddens the moment a fresh
 *          `package.json.declapract.ts` raw-parses `contents` off the allowlist. the "no STALE
 *          allowlist" case forces the ledger down — convert a declaration and its allowlist row must
 *          go, or the test reddens.
 */

const PRACTICES_DIR = `${__dirname}/practices`;

/**
 * .what = the allowlist of `package.json.declapract.ts` declarations that still raw-parse `contents`
 *         (paths relative to `src/practices`). this is the debt ledger; each row is a declaration
 *         yet to route through `asPackageJSON`, and the ratchet forbids the ledger to grow.
 */
const ALLOWED_UNCONVERTED = [
  'bottleneck/bad-practices/bottleneck/package.json.declapract.ts',
  'config/bad-practices/old-config-with-paramstore-dep/package.json.declapract.ts',
  'conventional-commits/bad-practices/commitlint/package.json.declapract.ts',
  'dates-and-times/bad-practices/uni-time/package.json.declapract.ts',
  'domain/bad-practices/simple-type-guards/package.json.declapract.ts',
  'environments/bad-practices/old-dev-scripts/package.json.declapract.ts',
  'errors/bad-practices/error-fns/package.json.declapract.ts',
  'format/bad-practices/format-script/package.json.declapract.ts',
  'format/bad-practices/prettier/package.json.declapract.ts',
  'husky/bad-practices/postinstall/package.json.declapract.ts',
  'lint/bad-practices/eslint/package.json.declapract.ts',
  'lint/bad-practices/tslint/package.json.declapract.ts',
  'logs/bad-practices/simple-log-methods/package.json.declapract.ts',
  'node-service/bad-practices/license/package.json.declapract.ts',
  'node-service/bad-practices/simple-lambda-client/package.json.declapract.ts',
  'node-service/bad-practices/simple-lambda-handlers/package.json.declapract.ts',
  'node/bad-practices/self-deps-not-link/package.json.declapract.ts',
  'package-json-order/best-practice/package.json.declapract.ts',
  'persist-with-rds/bad-practices/old-packagejson-script-names/package.json.declapract.ts',
  'pnpm/bad-practices/npm-overrides/package.json.declapract.ts',
  'runtime-schemas/bad-practices/joi/package.json.declapract.ts',
  'serverless/bad-practices/old-sls-plugins/package.json.declapract.ts',
  'tests-expo/bad-practices/inline-jest-config/package.json.declapract.ts',
  'tests-node/bad-practices/deprecated-test-deps/package.json.declapract.ts',
  'uuid/bad-practices/deps-file/package.json.declapract.ts',
  'uuid/bad-practices/npm-uuidv4/package.json.declapract.ts',
].sort();

/**
 * .what = whether a declaration's source text raw-parses `contents` WITHOUT a route through
 *         `asPackageJSON` — i.e. it is unconverted debt on the ledger.
 * .why  = a pure transformer leaf, named so the walk composer below reads intent rather than an
 *         inline regex a reader must simulate to know what "unconverted" means. the `JSON.parse`
 *         pattern matches `contents` ANYWHERE in the call args, not just as the exact first token —
 *         so a trimmed or coalesced form (`JSON.parse(contents.trim())`, `JSON.parse(contents ??
 *         '{}')`) cannot evade the ledger via a wrapped arg. the `asPackageJSON` guard is what
 *         lets a converted declaration drop off the ledger.
 */
const isRawParseOfPackageJSON = (input: { source: string }): boolean =>
  /JSON\.parse\([^)]*contents/.test(input.source) &&
  !input.source.includes('asPackageJSON');

/**
 * .what = every `package.json.declapract.ts` declaration path under the practice tree, relative to
 *         `src/practices`, that raw-parses `contents` without a route through `asPackageJSON`.
 */
const getUnconvertedRelPaths = (): string[] =>
  getAllPathsUnderDir({ dir: PRACTICES_DIR, skip: PRACTICE_TREE_SKIP_DIRS })
    .filter((path) => path.endsWith('package.json.declapract.ts'))
    .filter((path) =>
      isRawParseOfPackageJSON({ source: readFileSync(path, 'utf8') }),
    )
    .map((path) => relative(PRACTICES_DIR, path))
    .sort();

describe('asPackageJSON adoption — the raw-parse ratchet (D50 clamp)', () => {
  given('[case1] the current unconverted declarations vs the allowlist', () => {
    const scene = useBeforeAll(() => ({
      unconverted: getUnconvertedRelPaths(),
    }));

    when('[t0] the unconverted set is compared to the ledger', () => {
      then('no NEW declaration raw-parses off the allowlist', () => {
        // teeth: add a 27th `package.json.declapract.ts` with a raw `JSON.parse(contents)` and its
        // path lands here, off the allowlist, reddening this assertion.
        const newUnconverted = scene.unconverted.filter(
          (path) => !ALLOWED_UNCONVERTED.includes(path),
        );
        expect(newUnconverted).toEqual([]);
      });

      then('no allowlist row is stale — every entry still raw-parses', () => {
        // teeth: route one allowlisted declaration through `asPackageJSON` and its allowlist row
        // must go, or it surfaces here as a stale entry and reddens this assertion. the ledger can
        // only shrink.
        const staleAllowlist = ALLOWED_UNCONVERTED.filter(
          (path) => !scene.unconverted.includes(path),
        );
        expect(staleAllowlist).toEqual([]);
      });
    });
  });
});
