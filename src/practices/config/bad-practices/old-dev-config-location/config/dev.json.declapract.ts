import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move config/dev.json → config/prep.json and update access: dev → prep
  // also update .dev hostnames to .prep (e.g., bastion.dev.example.com → bastion.prep.example.com)
  let fixed = contents;
  if (fixed) {
    fixed = fixed
      .replace(/\.dev\b/g, '.prep')
      .replace(/"access":\s*"dev"/, '"access": "prep"');
  }
  return {
    contents: fixed ?? null,
    relativeFilePath: context.relativeFilePath.replace(
      /^config\/dev\.json$/,
      'config/prep.json',
    ),
  };
};
