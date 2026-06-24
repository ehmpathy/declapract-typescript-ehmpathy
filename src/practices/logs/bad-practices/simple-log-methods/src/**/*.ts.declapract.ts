import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = migrates simple-log-methods to sdk-logs with commit flow
 * .why = sdk-logs with commit flow enables traceability in production logs
 *
 * .note = declapract semantics:
 *   - check returns = bad practice detected (file will be flagged)
 *   - check throws = bad practice not detected (file will be skipped)
 *   - fix returns {} = no changes needed
 */

export const check: FileCheckFunction = (contents) => {
  // detect files that import from simple-log-methods
  if (contents?.includes("from 'simple-log-methods'")) return;
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  // no contents means no file to fix
  if (!contents) return {};

  // step 1: replace package import and method name
  const withSdkLogs = contents
    .replace(/from 'simple-log-methods'/g, "from 'sdk-logs'")
    .replace(/generateLogMethods/g, 'genLogMethods');

  // step 2: add sdk-environment import if not already present (idempotent)
  const needsEnvImport = !withSdkLogs.includes("from 'sdk-environment'");
  const withEnvImport = needsEnvImport
    ? withSdkLogs.replace(
        /import { genLogMethods } from 'sdk-logs';/g,
        "import { getEnvironment } from 'sdk-environment';\nimport { genLogMethods } from 'sdk-logs';",
      )
    : withSdkLogs;

  // step 3: flow commit through env (only for no-arg calls)
  const withCommitFlow = withEnvImport.replace(
    /genLogMethods\(\)/g,
    `genLogMethods({
  env: { commit: getEnvironment.static().commit },
})`,
  );

  return { contents: withCommitFlow };
};
