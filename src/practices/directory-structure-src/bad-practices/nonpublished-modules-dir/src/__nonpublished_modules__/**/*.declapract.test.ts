import { fix } from './*.declapract';

describe('nonpublished-modules-dir bad practice', () => {
  it('should move src/__nonpublished_modules__/* to src/_topublish/*', async () => {
    const contents = `export class Price {}`;
    const context = {
      relativeFilePath:
        'src/__nonpublished_modules__/domain-glossary-price/src/index.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/_topublish/domain-glossary-price/src/index.ts',
    );
    expect(result.contents).toEqual(contents);
  });

  it('should move nested __nonpublished_modules__ paths', async () => {
    const contents = `export const config = {};`;
    const context = {
      relativeFilePath:
        'src/__nonpublished_modules__/my-pkg/src/domain/objects/Item.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/_topublish/my-pkg/src/domain/objects/Item.ts',
    );
    expect(result.contents).toEqual(contents);
  });
});
