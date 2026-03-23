import fs from 'node:fs';
import util from 'node:util';

export const readFile = async (filePath: string): Promise<string> =>
  util.promisify(fs.readFile)(filePath, 'utf-8');
