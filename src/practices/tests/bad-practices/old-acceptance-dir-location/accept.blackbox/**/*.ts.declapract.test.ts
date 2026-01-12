import { fix } from './*.ts.declapract';

describe('old-acceptance-dir-location accept.blackbox ts files', () => {
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
});
