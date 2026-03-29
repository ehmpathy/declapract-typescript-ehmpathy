import fs from 'node:fs';
import os from 'os';
import path from 'node:path';

import type { KeyrackGrantAttempt } from 'rhachet/keyrack';

/**
 * .what = creates a mock context with keyrack config in a temp directory
 * .why = enables test of buildWorkflowSecretsBlock with different keyrack configs
 */
export const withKeyrackContext = async (
  input: { keys: string[] },
  fn: (context: { getProjectRootDirectory: () => string }) => Promise<void>,
): Promise<void> => {
  // create temp dir with keyrack.yml
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  const agentDir = path.join(tempDir, '.agent');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentDir, 'keyrack.yml'),
    `org: test\nenv.test:\n${input.keys.map((k) => `  - ${k}`).join('\n')}`,
  );

  // mock keyrack.get to return grant attempts
  const mockGrants: KeyrackGrantAttempt[] = input.keys.map((key) => ({
    status: 'granted' as const,
    grant: {
      slug: `test.test.${key}`,
      value: 'mock-value',
      mech: 'PERMANENT_VIA_REPLICA' as const,
      vault: 'os.direct' as const,
    },
  }));

  // store original module
  const keyrackModule = await import('rhachet/keyrack');
  const originalGet = keyrackModule.keyrack.get;

  // replace with mock
  (keyrackModule.keyrack as { get: typeof originalGet }).get = async () =>
    mockGrants;

  try {
    await fn({ getProjectRootDirectory: () => tempDir });
  } finally {
    // restore original
    (keyrackModule.keyrack as { get: typeof originalGet }).get = originalGet;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};
