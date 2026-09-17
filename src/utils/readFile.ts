import fs from 'node:fs';
import util from 'node:util';

export const readFile = async (input: { filePath: string }): Promise<string> =>
  util.promisify(fs.readFile)(input.filePath, 'utf-8');
