import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (_, context) => {
  return {
    relativeFilePath: context.relativeFilePath.replace(
      /provision\/schema\/entities\//g,
      'provision/schema/domain/',
    ),
  };
};
