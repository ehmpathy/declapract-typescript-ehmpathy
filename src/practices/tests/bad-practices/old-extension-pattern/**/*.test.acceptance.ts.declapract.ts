import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS; // if files matching this pattern exist, bad practice

export const fix: FileFixFunction = (contents, context) => ({
  relativeFilePath: context.relativeFilePath.replace(
    /\.test\.acceptance\.ts$/,
    '.acceptance.test.ts',
  ),
  contents,
});
