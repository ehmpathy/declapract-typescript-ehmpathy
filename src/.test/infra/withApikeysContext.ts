import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * .what = creates a mock context with apikeys config in a temp directory
 * .why = enables testing buildWorkflowSecretsBlock with different apikey configs
 */
export const withApikeysContext = async (
  input: { apikeys: string[] },
  fn: (context: { getProjectRootDirectory: () => string }) => Promise<void>,
): Promise<void> => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  const configDir = path.join(
    tempDir,
    '.agent',
    'repo=.this',
    'role=any',
    'skills',
  );
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'use.apikeys.json'),
    JSON.stringify({ apikeys: { required: input.apikeys } }, null, 2),
  );
  try {
    await fn({ getProjectRootDirectory: () => tempDir });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};
