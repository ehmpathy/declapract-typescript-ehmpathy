import { fix } from './*.ts.declapract';

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
      relativeFilePath: 'src/domain/objects/billing/Invoice.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/domain.objects/billing/Invoice.ts',
    );
    expect(result.contents).toEqual(contents);
  });
});
