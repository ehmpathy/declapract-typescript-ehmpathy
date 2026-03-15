import { fix } from './*.declapract';

describe('model-dir file move bad practice', () => {
  it('should move src/model/* to src/domain.objects/*', async () => {
    const contents = `export class User {}`;
    const context = {
      relativeFilePath: 'src/model/User.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/User.ts');
    expect(result.contents).toEqual(contents);
  });

  it('should move src/model/domainObjects/* to src/domain.objects/*', async () => {
    const contents = `export class Invoice {}`;
    const context = {
      relativeFilePath: 'src/model/domainObjects/Invoice.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/Invoice.ts');
    expect(result.contents).toEqual(contents);
  });

  it('should replace export * from domainObjects', async () => {
    const contents = `export * from './domainObjects';`;
    const context = {
      relativeFilePath: 'src/model/index.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/index.ts');
    expect(result.contents).toEqual(`export * from './';`);
  });

  it('should move non-ts files (catch-all)', async () => {
    const contents = `{"key": "value"}`;
    const context = {
      relativeFilePath: 'src/model/config.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/config.json');
    expect(result.contents).toEqual(contents);
  });

  it('should handle null contents', async () => {
    const context = {
      relativeFilePath: 'src/model/readme.md',
    } as any;

    const result = await fix(null, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/readme.md');
    expect(result.contents).toBeNull();
  });
});
