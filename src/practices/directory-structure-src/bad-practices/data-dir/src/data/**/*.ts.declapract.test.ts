import { fix } from './*.ts.declapract';

describe('data-dir bad practice', () => {
  it('should move src/data/dao/* to src/access/daos/*', async () => {
    const contents = `export const userDao = {};`;
    const context = {
      relativeFilePath: 'src/data/dao/userDao.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/access/daos/userDao.ts');
    expect(result.contents).toEqual(contents);
  });

  it('should move src/data/clients/* to src/access/sdks/*', async () => {
    const contents = `export const stripeClient = {};`;
    const context = {
      relativeFilePath: 'src/data/clients/stripeClient.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/access/sdks/stripeClient.ts');
    expect(result.contents).toEqual(contents);
  });

  it('should move other src/data/* to src/access/*', async () => {
    const contents = `export const something = {};`;
    const context = {
      relativeFilePath: 'src/data/something.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/access/something.ts');
    expect(result.contents).toEqual(contents);
  });
});
