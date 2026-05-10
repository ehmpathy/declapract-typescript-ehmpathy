import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move config/dev.json → config/prep.json and update .dev → .prep references
  const updatedContents = contents
    ?.replace(/\.dev\b/g, '.prep')
    .replace(/"access":\s*"dev"/, '"access": "prep"')
    .replace(/"__CHANG3_ME__"/g, '"$.at(aws::param)"');

  return {
    contents: updatedContents ?? null,
    relativeFilePath: context.relativeFilePath.replace(
      /^config\/dev\.json$/,
      'config/prep.json',
    ),
  };
};
