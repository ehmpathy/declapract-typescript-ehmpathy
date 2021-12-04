import { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

export const check: FileCheckFunction = (contents) => {
  expect(JSON.stringify(contents ?? 'null')).toMatchObject(
    expect.objectContaining({
      dependencies: expect.objectContaining({
        uuid: expect.any(String),
      }),
      devDependencies: expect.objectContaining({
        '@types/uuid': expect.any(String),
      }),
    }),
  );
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // should not occur
  const packageJSONObject = JSON.parse(contents);
  const fixedPackageJSONObject = {
    ...packageJSONObject,
    dependencies: { ...packageJSONObject.dependencies, uuid: undefined },
    devDependencies: {
      ...packageJSONObject.devDependencies,
      '@types/uuid': undefined,
    },
  };
  return { contents: JSON.stringify(fixedPackageJSONObject, null, 2) };
};
