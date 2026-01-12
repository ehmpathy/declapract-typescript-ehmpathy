import fs from 'fs';
import path from 'path';
import util from 'util';

/**
 * .what = configuration structure for use.apikeys.json
 * .why = defines which api keys are required for integration tests
 */
export interface UseApikeysConfig {
  apikeys: {
    required: string[];
  };
}

const USE_APIKEYS_PATH = '.agent/repo=.this/role=any/skills/use.apikeys.json';

/**
 * .what = reads and parses use.apikeys.json from target project
 * .why = centralizes apikey config access for all workflow practices
 */
export const readUseApikeysConfig = async (input: {
  projectRootDirectory: string;
}): Promise<UseApikeysConfig | null> => {
  // build full path to config file
  const configPath = path.join(input.projectRootDirectory, USE_APIKEYS_PATH);

  // check if file exists
  const exists = await util
    .promisify(fs.access)(configPath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
  if (!exists) return null;

  // read and parse the file
  try {
    const contents = await util.promisify(fs.readFile)(configPath, 'utf-8');
    const parsed = JSON.parse(contents) as UseApikeysConfig;
    return parsed;
  } catch {
    // handle malformed json gracefully
    return null;
  }
};
