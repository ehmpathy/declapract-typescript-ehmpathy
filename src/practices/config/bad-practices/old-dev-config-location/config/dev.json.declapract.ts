import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move config/dev.json → config/prep.json and update access: dev → prep
  let fixed = contents;
  if (fixed) {
    fixed = fixed.replace(/"access":\s*"dev"/, '"access": "prep"');
  }
  return {
    contents: fixed ?? null,
    relativeFilePath: context.relativeFilePath.replace(
      /^config\/dev\.json$/,
      'config/prep.json',
    ),
  };
};
