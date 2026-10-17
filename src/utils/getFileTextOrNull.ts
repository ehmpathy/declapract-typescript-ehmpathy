import fs from 'node:fs';
import path from 'node:path';

/**
 * .what = the text of a file under a root, or null where the file is absent
 * .why = several declarations read an optional neighbor file (the lockfile, the repo's own
 *        package.json); one named read keeps that i/o boundary in one place
 */
export const getFileTextOrNull = (input: {
  root: string;
  relativePath: string;
}): string | null => {
  const filePath = path.join(input.root, input.relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
};
