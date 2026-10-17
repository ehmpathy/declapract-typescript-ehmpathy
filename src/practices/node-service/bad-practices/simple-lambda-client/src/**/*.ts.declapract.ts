import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asObjectLiteralProps } from '../../../../../../utils/asObjectLiteralProps';
import { withEachCallRewritten } from '../../../../../../utils/withEachCallRewritten';

/**
 * .what = detects simple-lambda-client imports in source files
 * .why = simple-lambda-client should be replaced with sdk-aws-lambda
 */
export const check: FileCheckFunction = (contents) => {
  // match if file imports from simple-lambda-client
  if (contents?.includes("from 'simple-lambda-client'")) return;
  if (contents?.includes('from "simple-lambda-client"')) return;

  // no match
  throw new Error('does not import from simple-lambda-client');
};

/**
 * .what = `invokeLambdaFunction({ service, function, stage, event, cache? })` →
 *         `sdkAwsLambdaAskAncient({ which: { service, function }, event }, { log, cache? })`
 * .why  = a simple-lambda-client caller sends a flat event to the peer's `-dev-` name below prod —
 *         the ancient address and the ancient payload together. `sdkAwsLambdaAskAncient` binds
 *         both, so the move keeps the wire identical (#631). `stage` and `logDebug` have no slot:
 *         the slug comes from the env helper, the logger from the context.
 */
const asAskAncientCall = (input: { argsText: string }): string => {
  // a non-literal argument cannot be read field by field; rename the callee alone, so tsc names it
  const objectText = input.argsText.trim();
  if (!objectText.startsWith('{') || !objectText.endsWith('}'))
    return `sdkAwsLambdaAskAncient(${input.argsText})`;

  // the props, each read by key; a shorthand prop reads its own name
  const props = asObjectLiteralProps({ body: objectText.slice(1, -1) });
  const valueAt = (key: string): string | null => {
    const prop = props.find((each) => each.key === key);
    if (!prop) return null;
    return prop.value ?? key;
  };
  const asShifted = (text: string) => text.replace(/\n/g, '\n  ');
  const cache = valueAt('cache');

  return [
    'sdkAwsLambdaAskAncient(',
    '  {',
    `    which: { service: ${valueAt('service')}, function: ${valueAt('function')} },`,
    `    event: ${asShifted(valueAt('event') ?? 'undefined')},`,
    '  },',
    cache ? `  { log, cache: { response: ${cache} } },` : '  { log },',
    ')',
  ].join('\n');
};

/**
 * .what = transforms simple-lambda-client usage to sdk-aws-lambda
 * .why = automated migration reduces manual toil
 *
 * API map (#631):
 * - invokeLambdaFunction(…) → sdkAwsLambdaAskAncient(…), from the node-service helper
 * - every other imported name → the same name, from sdk-aws-lambda
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};

  // the import: invokeLambdaFunction moves to the helper; any other name to sdk-aws-lambda
  const imported = contents.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]simple-lambda-client['"];?/g,
    (_match, clause: string) => {
      const names = clause
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const rest = names.filter((name) => name !== 'invokeLambdaFunction');
      const usesInvoke = names.length !== rest.length;
      const hasLog = /import\s*\{[^}]*\blog\b[^}]*\}\s*from/.test(contents);
      return [
        ...(rest.length
          ? [`import { ${rest.join(', ')} } from 'sdk-aws-lambda';`]
          : []),
        ...(usesInvoke
          ? [
              "import { sdkAwsLambdaAskAncient } from '@src/access/sdks/sdkAwsLambdaAskAncient';",
              ...(hasLog ? [] : ["import { log } from '@src/utils/logger';"]),
            ]
          : []),
      ].join('\n');
    },
  );

  // each call, onto the ancient ask helper
  const updated = withEachCallRewritten({
    contents: imported,
    callee: 'invokeLambdaFunction',
    rewrite: asAskAncientCall,
  });

  return { contents: updated };
};
