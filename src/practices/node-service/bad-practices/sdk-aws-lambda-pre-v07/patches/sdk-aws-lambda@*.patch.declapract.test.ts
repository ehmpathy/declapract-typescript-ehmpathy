import { then } from 'test-fns';

import { check, fix } from './sdk-aws-lambda@*.patch.declapract';

describe('sdk-aws-lambda-pre-v07 patches', () => {
  then('a 0.7.0 patch is detected and deleted', () => {
    const context = {
      relativeFilePath: 'patches/sdk-aws-lambda@0.7.0.patch',
    } as any;
    expect(() => check('diff --git a/x b/x', context)).not.toThrow();
    expect(fix('diff --git a/x b/x', context)).toEqual({ contents: null });
  });

  then('a 0.7.1 patch, one release below the floor, is detected and deleted', () => {
    const context = {
      relativeFilePath: 'patches/sdk-aws-lambda@0.7.1.patch',
    } as any;
    expect(() => check('diff --git a/x b/x', context)).not.toThrow();
    expect(fix('diff --git a/x b/x', context)).toEqual({ contents: null });
  });

  then('a 0.7.2 patch is the consumer choice, and stays', () => {
    const context = {
      relativeFilePath: 'patches/sdk-aws-lambda@0.7.2.patch',
    } as any;
    expect(() => check('diff --git a/x b/x', context)).toThrow();
  });
});
