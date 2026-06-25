import type { FileCheckFunction, FileFixFunction } from 'declapract';

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
 * .what = transforms simple-lambda-client imports to sdk-aws-lambda
 * .why = automated migration reduces manual toil
 *
 * .note = basic transforms only; complex patterns require manual fix
 *
 * API map:
 * - invokeLambdaFunction → askLambdaEndpoint
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};

  const updated = contents
    // transform imports
    .replace(
      /import\s+\{([^}]*)\}\s+from\s+['"]simple-lambda-client['"]/g,
      (match, imports) => {
        const updatedImports = imports.replace(
          /invokeLambdaFunction/g,
          'askLambdaEndpoint',
        );
        return `import {${updatedImports}} from 'sdk-aws-lambda'`;
      },
    )
    // transform function calls
    .replace(/invokeLambdaFunction/g, 'askLambdaEndpoint');

  return { contents: updated };
};
