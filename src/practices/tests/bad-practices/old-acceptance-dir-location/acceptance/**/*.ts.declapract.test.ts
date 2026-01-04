import { fix } from './*.ts.declapract';

describe('old-acceptance-dir-location ts files', () => {
  it('should move ts files from acceptance/ to blackbox/', async () => {
    const contents = `export const locally = process.env.LOCALLY === 'true';`;
    const context = {
      relativeFilePath: 'acceptance/environment.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('blackbox/environment.ts');
    expect(result.contents).toBe(contents);
  });

  it('should move nested ts files', async () => {
    const contents = `export const helper = () => {};`;
    const context = {
      relativeFilePath: 'acceptance/_utils/helper.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('blackbox/_utils/helper.ts');
  });
});
