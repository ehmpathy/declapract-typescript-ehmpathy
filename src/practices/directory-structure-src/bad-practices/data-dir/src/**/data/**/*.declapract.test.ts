import { fix } from './*.declapract';

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
    const contents = `export const helper = {};`;
    const context = {
      relativeFilePath: 'src/data/helper.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/access/helper.ts');
    expect(result.contents).toEqual(contents);
  });

  it('should move non-ts files (catch-all)', async () => {
    const contents = `{"key": "value"}`;
    const context = {
      relativeFilePath: 'src/data/dao/config.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/access/daos/config.json');
    expect(result.contents).toEqual(contents);
  });

  it('should handle null contents', async () => {
    const context = {
      relativeFilePath: 'src/data/readme.md',
    } as any;

    const result = await fix(null, context);

    expect(result.relativeFilePath).toEqual('src/access/readme.md');
    expect(result.contents).toBeNull();
  });
});
