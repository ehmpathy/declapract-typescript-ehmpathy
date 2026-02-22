import { fix } from './*.declapract';

describe('old-acceptance-dir-location accept.blackbox catch-all', () => {
  // ts files
  it('should move ts files from accept.blackbox/ to blackbox/', async () => {
    const contents = `export const locally = process.env.LOCALLY === 'true';`;
    const context = {
      relativeFilePath: 'accept.blackbox/environment.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('blackbox/environment.ts');
    expect(result.contents).toBe(contents);
  });

  it('should move nested ts files', async () => {
    const contents = `export const helper = () => {};`;
    const context = {
      relativeFilePath: 'accept.blackbox/_utils/helper.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('blackbox/_utils/helper.ts');
  });

  // acceptance test files
  it('should move acceptance test files from accept.blackbox/ to blackbox/', async () => {
    const contents = `import { util } from './utils';`;
    const context = {
      relativeFilePath: 'accept.blackbox/lambdas/myLambda.acceptance.test.ts',
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
      relativeFilePath:
        'accept.blackbox/nested/deep/test.acceptance.test.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'blackbox/nested/deep/test.acceptance.test.ts',
    );
  });

  it('should move root acceptance test files', async () => {
    const contents = `describe('root', () => {});`;
    const context = {
      relativeFilePath: 'accept.blackbox/root.acceptance.test.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('blackbox/root.acceptance.test.ts');
  });

  // hidden directory files (the bug we fixed)
  it('should move json files in hidden directories', async () => {
    const contents = '{}';
    const context = {
      relativeFilePath: 'accept.blackbox/.test/assets/.rhachet/manifest.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'blackbox/.test/assets/.rhachet/manifest.json',
    );
    expect(result.contents).toBe(contents);
  });

  it('should move yml files in hidden directories', async () => {
    const contents = 'key: value';
    const context = {
      relativeFilePath: 'accept.blackbox/.test/assets/.agent/config.yml',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'blackbox/.test/assets/.agent/config.yml',
    );
    expect(result.contents).toBe(contents);
  });

  it('should move deeply nested files in hidden directories', async () => {
    const contents = 'test content';
    const context = {
      relativeFilePath: 'accept.blackbox/.hidden/deep/.nested/file.txt',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'blackbox/.hidden/deep/.nested/file.txt',
    );
  });
});
