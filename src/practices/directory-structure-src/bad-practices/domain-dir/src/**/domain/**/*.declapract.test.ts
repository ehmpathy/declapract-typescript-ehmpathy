import { fix } from './*.declapract';

describe('domain-dir bad practice', () => {
  it('should move src/domain/objects/* to src/domain.objects/*', async () => {
    const contents = `export class User {}`;
    const context = {
      relativeFilePath: 'src/domain/objects/User.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/User.ts');
    expect(result.contents).toEqual(contents);
  });

  it('should move src/domain/* to src/domain.objects/*', async () => {
    const contents = `export const constants = {};`;
    const context = {
      relativeFilePath: 'src/domain/constants.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/constants.ts');
    expect(result.contents).toEqual(contents);
  });

  it('should move nested src/domain/objects/nested/* to src/domain.objects/nested/*', async () => {
    const contents = `export class Invoice {}`;
    const context = {
      relativeFilePath: 'src/domain/objects/nested/Invoice.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/domain.objects/nested/Invoice.ts',
    );
    expect(result.contents).toEqual(contents);
  });

  it('should move nested _topublish/*/src/domain/* to _topublish/*/src/domain.objects/*', async () => {
    const contents = `export class Customer {}`;
    const context = {
      relativeFilePath:
        'src/_topublish/domain-glossary-price/src/domain/objects/Price.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/_topublish/domain-glossary-price/src/domain.objects/Price.ts',
    );
    expect(result.contents).toEqual(contents);
  });

  it('should move non-ts files (catch-all)', async () => {
    const contents = `{"key": "value"}`;
    const context = {
      relativeFilePath: 'src/domain/objects/config.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/config.json');
    expect(result.contents).toEqual(contents);
  });

  it('should handle null contents', async () => {
    const context = {
      relativeFilePath: 'src/domain/readme.md',
    } as any;

    const result = await fix(null, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/readme.md');
    expect(result.contents).toBeNull();
  });
});
