import { fix } from './*.acceptance.test.ts.declapract';

describe('old-acceptance-dir-location acceptance test files', () => {
  it('should move files from acceptance/ to blackbox/', async () => {
    const contents = `import { something } from './utils';`;
    const context = {
      relativeFilePath: 'acceptance/lambdas/myLambda.acceptance.test.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'blackbox/lambdas/myLambda.acceptance.test.ts',
    );
    expect(result.contents).toBe(contents);
  });

  it('should move nested acceptance test files', async () => {
    const contents = `describe('test', () => {});`;
    const context = {
      relativeFilePath: 'acceptance/nested/deep/test.acceptance.test.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'blackbox/nested/deep/test.acceptance.test.ts',
    );
  });

  it('should move root acceptance test files', async () => {
    const contents = `describe('root', () => {});`;
    const context = {
      relativeFilePath: 'acceptance/root.acceptance.test.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('blackbox/root.acceptance.test.ts');
  });
});
