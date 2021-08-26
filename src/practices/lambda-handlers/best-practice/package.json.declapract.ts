import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';

export const check = async () => {
  return expect.objectContaining({
    dependencies: expect.objectContaining({
      '@middy/core': expect.stringMatching(defineMinPackageVersionRegex('1.0.0')),
      'simple-lambda-handlers': expect.stringMatching(defineMinPackageVersionRegex('0.5.0')),
    }),
    devDependencies: expect.objectContaining({
      '@types/aws-lambda': expect.stringMatching(defineMinPackageVersionRegex('8.10.40')),
    }),
  });
};
