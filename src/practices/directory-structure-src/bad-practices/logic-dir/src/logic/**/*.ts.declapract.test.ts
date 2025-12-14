import { fix } from './*.ts.declapract';

describe('logic-dir bad practice', () => {
  it('should move src/logic/* to src/domain.operations/*', async () => {
    const contents = `export const calculateTotal = () => {};`;
    const context = {
      relativeFilePath: 'src/logic/calculateTotal.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/domain.operations/calculateTotal.ts',
    );
    expect(result.contents).toEqual(contents);
  });

  it('should move nested src/logic/* to src/domain.operations/*', async () => {
    const contents = `export const generateInvoice = () => {};`;
    const context = {
      relativeFilePath: 'src/logic/billing/generateInvoice.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/domain.operations/billing/generateInvoice.ts',
    );
    expect(result.contents).toEqual(contents);
  });
});
