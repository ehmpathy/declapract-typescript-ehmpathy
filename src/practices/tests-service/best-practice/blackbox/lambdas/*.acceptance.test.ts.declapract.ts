import type { FileCheckFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';

import { asTestKindPresenceCheck } from '../../../../../utils/asTestKindPresenceCheck';
import { asFunctionNameFromTestFileName } from '../../../asFunctionNameFromTestFileName';

/**
 * .what = the presence check for a repo with no old-suffix lambda acceptance test
 * .why  = a repo that names its tests with the `._.acpt` kind seam (#679) holds lambda acceptance
 *         tests the declared glob cannot see; only where neither form is found is the kind absent
 */
const checkLambdaAcceptancePresence = asTestKindPresenceCheck({
  dir: 'blackbox/lambdas',
  suffixOld: '.acceptance.test.ts',
  suffixSeam: '._.acpt.test.ts',
});

export const check: FileCheckFunction = (contents, context) => {
  if (!contents) return checkLambdaAcceptancePresence(contents, context);

  // check that each import was found.
  // D52: this check no longer MANDATES `import { stage } from '.../environment'`. that line was
  // break-by-conformance: it forced 88 blackbox files onto the legacy `dev`-slug axis to build a
  // target fleet name no peer publishes below prod. a consumer may still import what it needs, but
  // the practice must not require the exact token the north-star exists to retire. the fleet-
  // name rewrite (dev↔prep) is the collapse-coupled half (D52b) and is out of this check.
  //
  // .note = the match below is literal, not semantic. it holds by construction on the file the
  // practice itself stamps, but a consumer's own import-sorter may later wrap a line, merge it with
  // a co-specifier import, or swap the quote style — any of which trips a cryptic `Expected imports`
  // throw against a functionally-equivalent file. the literal match is deliberate (both lines dodge
  // a typical print-width wrap), and a lenient regex/ast match is a tracked follow-on; this comment
  // is the durable disclosure, so the brittleness is legible in-code, not only in the route yield
  // (i015 r10 §3).
  //
  // #650: the check no longer MANDATES the retired simple-lambda-testing-methods import. this
  // check has no fix, so a throw here marks the file manual and blocks the
  // `simple-lambda-testing-methods` bad-practice from its move onto runLambdaEndpoint (#607). the
  // successor import is not mandated either — a test may reach the lambda through a seam.
  const expectedImports = ["import { locally } from '../environment';"];
  const missedImports = expectedImports.filter(
    (expectedImport) => !contents.includes(expectedImport),
  );
  if (missedImports.length)
    throw new ConstraintError(
      `
${`- Expected imports ${['', ...expectedImports].join('\n  - ')}`}
      `.trim(),
      { relativeFilePath: context.relativeFilePath, missedImports },
    );

  const expectedTestName = asFunctionNameFromTestFileName({
    relativeFilePath: context.relativeFilePath,
  });
  const expectedDescribe = `
describe('${expectedTestName}', () => {
  `.trim();
  // route the describe-name mismatch through a ConstraintError, same as the paths above —
  // a bare `expect(...).toContain(...)` throws jest's raw ANSI+middle-dot diff, which snapshots
  // as terminal noise (rule.forbid.snapshot-visual-blemishes). name the derived describe plainly.
  if (!contents.includes(expectedDescribe))
    throw new ConstraintError(
      `expected a \`describe\` block that names the derived function: ${expectedDescribe}`,
      { relativeFilePath: context.relativeFilePath, expectedTestName },
    );
};
