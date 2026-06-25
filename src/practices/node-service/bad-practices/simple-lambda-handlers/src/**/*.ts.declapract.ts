import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects simple-lambda-handlers imports in source files
 * .why = simple-lambda-handlers should be replaced with sdk-aws-lambda
 */
export const check: FileCheckFunction = (contents) => {
  // match if file imports from simple-lambda-handlers
  if (contents?.includes("from 'simple-lambda-handlers'")) return;
  if (contents?.includes('from "simple-lambda-handlers"')) return;

  // no match
  throw new Error('does not import from simple-lambda-handlers');
};

/**
 * .what = transforms simple-lambda-handlers imports to sdk-aws-lambda
 * .why = automated migration reduces manual toil
 *
 * .note = basic transforms only; complex patterns require manual fix
 *
 * API map:
 * - createStandardHandler → genLambdaEndpoint
 * - createApiGatewayHandler → genLambdaEndpoint.for.apiGateway
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};

  const updated = contents
    // transform imports (dedupe to avoid duplicate genLambdaEndpoint)
    .replace(
      /import\s+\{([^}]*)\}\s+from\s+['"]simple-lambda-handlers['"]/g,
      (match, imports) => {
        // split, replace, dedupe, join
        const importList = imports.split(',').map((s: string) => s.trim());
        const transformed = importList.map((name: string) => {
          if (name === 'createStandardHandler') return 'genLambdaEndpoint';
          if (name === 'createApiGatewayHandler') return 'genLambdaEndpoint';
          return name;
        });
        const deduped = [...new Set(transformed)];
        return `import { ${deduped.join(', ')} } from 'sdk-aws-lambda'`;
      },
    )
    // transform function calls
    .replace(/createStandardHandler/g, 'genLambdaEndpoint')
    .replace(/createApiGatewayHandler/g, 'genLambdaEndpoint.for.apiGateway');

  return { contents: updated };
};
