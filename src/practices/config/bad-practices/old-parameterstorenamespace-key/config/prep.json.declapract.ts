import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const config = JSON.parse(contents);
  const { parameterStoreNamespace: _, ...rest } = config;
  return {
    contents: JSON.stringify(rest, null, 2),
  };
};
