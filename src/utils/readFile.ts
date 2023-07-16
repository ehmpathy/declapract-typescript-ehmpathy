import fs from 'fs';
import util from 'util';

export const readFile = async (filePath: string) =>
  util.promisify(fs.readFile)(filePath, 'utf-8');
