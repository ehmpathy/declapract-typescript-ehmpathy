import { FileCheckContext } from 'declapract';

export const defineFunctionNameFromTestFileName = ({
  context,
}: {
  context: FileCheckContext;
}): string =>
  context.relativeFilePath // same name as the file
    .split('/')
    .slice(-1)[0]
    .replace('.acceptance.test.ts', ''); // remove the extension from the file
