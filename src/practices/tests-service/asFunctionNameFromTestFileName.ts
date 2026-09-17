import { basename } from 'node:path';

export const asFunctionNameFromTestFileName = (input: {
  relativeFilePath: string;
}): string =>
  // the function name = the test file's basename, minus the acceptance-test extension
  basename(input.relativeFilePath).replace('.acceptance.test.ts', '');
