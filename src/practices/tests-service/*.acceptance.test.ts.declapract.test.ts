import { getError } from 'test-fns';

import { check } from './best-practice/blackbox/lambdas/*.acceptance.test.ts.declapract';

/**
 * .what = unit clamp for the D52 blackbox acceptance-test check — the wish's
 *         "largest defect of the round" fix (drop the mandated `import { stage }`).
 * .why  = a best-practice check that emits no template cannot be proven by a snapshot;
 *         only a direct call proves (a) a file without `import { stage }` now passes —
 *         the whole point of D52 — and (b) the still-required imports + describe name
 *         still gate. per rule.require.clamp-edge-cases, the highest-priority row owes a
 *         teeth'd clamp, not just a code edit. each throw path also snapshots its message
 *         text, so a reviewer can vibecheck the exact user-faced copy per
 *         rule.require.contract-snapshot-exhaustiveness.
 * .teeth = the `stage`-import case is the load-bearer: it went red under the pre-D52 check
 *          (which listed `import { stage }` in expectedImports) and passes now.
 */

// a context that names the acceptance-test file, so the check derives the expected describe.
const genContext = (relativeFilePath: string) =>
  ({ relativeFilePath }) as any;

// a well-formed blackbox acceptance test for a lambda named `getSurfReport`, without the
// `import { stage }` line the D52 fix retired.
const genWellFormedContents = (functionName: string): string =>
  `
import { runLambdaEndpoint } from 'sdk-aws-lambda';

import { locally } from '../environment';

describe('${functionName}', () => {
  it('responds', async () => {
    const response = await runLambdaEndpoint.onSerialized(
      { which, event, at: locally ? 'local' : 'cloud' },
      context,
    );
    expect(response).toBeDefined();
  });
});
`.trim();

// the same test on the retired lib (#650), which the check must still pass, so the
// simple-lambda-testing-methods bad-practice is never blocked by a fixless throw (#607)
const genRetiredLibContents = (functionName: string): string =>
  genWellFormedContents(functionName).replace(
    "import { runLambdaEndpoint } from 'sdk-aws-lambda';",
    "import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';",
  );

describe('tests-service — blackbox acceptance-test check (D52 clamp)', () => {
  describe('[case1] a file without `import { stage }` (the D52 point)', () => {
    it('[t0] passes — the retired axis token is no longer mandated', () => {
      const contents = genWellFormedContents('getSurfReport');
      const context = genContext(
        'blackbox/lambdas/getSurfReport.acceptance.test.ts',
      );
      // the sole assertion that would have gone RED under the pre-D52 check
      expect(() => check(contents, context)).not.toThrow();
    });
  });

  describe('[case2] a file that still holds `import { stage }`', () => {
    it('[t0] still passes — D52 dropped the requirement, not the permission to import', () => {
      const withStage = `import { stage } from '../../src/utils/environment';\n${genWellFormedContents(
        'getSurfReport',
      )}`;
      const context = genContext(
        'blackbox/lambdas/getSurfReport.acceptance.test.ts',
      );
      expect(() => check(withStage, context)).not.toThrow();
    });
  });

  describe('[case3] a file that lacks a still-required import', () => {
    it('[t0] passes on the retired lib too — #650 dropped that mandate, so its bad-practice is never blocked', () => {
      const context = genContext(
        'blackbox/lambdas/getSurfReport.acceptance.test.ts',
      );
      expect(() =>
        check(genRetiredLibContents('getSurfReport'), context),
      ).not.toThrow();
    });

    it('[t1] throws when `locally` is absent', () => {
      const withoutLocally = genWellFormedContents('getSurfReport').replace(
        "import { locally } from '../environment';\n\n",
        '',
      );
      const context = genContext(
        'blackbox/lambdas/getSurfReport.acceptance.test.ts',
      );
      const error = getError(() => check(withoutLocally, context));
      expect(error.message).toContain('Expected imports');
      expect(error.message).toMatchSnapshot();
    });
  });

  describe('[case4] a file whose describe name does not match the file', () => {
    it('[t0] throws — the describe must name the derived function', () => {
      // file says `getSurfReport`, describe says `getWrong` → the expect(toContain) fails
      const wrongDescribe = genWellFormedContents('getWrong');
      const context = genContext(
        'blackbox/lambdas/getSurfReport.acceptance.test.ts',
      );
      // pin the signal: the throw must name the derived describe, not a generic error before it
      const error = getError(() => check(wrongDescribe, context));
      expect(error.message).toContain("describe('getSurfReport'");
      expect(error.message).toMatchSnapshot();
    });
  });

  // .note = the absent-file case reads the repo tree (a `._.acpt.test.ts` seam counts as present,
  //         #679), so it lives in tests-any/test-kind-seam.declapract.integration.test.ts
});
