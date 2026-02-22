import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

/**
 * .what = moves any file from provision/terraform/ to provision/aws/
 * .why = ensures all files are moved, not just .tf/.hcl files — prevents silent data loss for hidden paths
 */
export const fix: FileFixFunction = (contents, context) => {
  return {
    contents: contents ?? null,
    relativeFilePath: context.relativeFilePath.replace(
      'provision/terraform/',
      'provision/aws/',
    ),
  };
};
