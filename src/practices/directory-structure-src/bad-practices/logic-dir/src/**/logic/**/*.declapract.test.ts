import { fix } from './*.declapract';

describe('logic-dir catch-all', () => {
  it('should move json files from src/logic/ to src/domain.operations/', async () => {
    const contents = '{}';
    const context = {
      relativeFilePath: 'src/logic/config/settings.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'src/domain.operations/config/settings.json',
    );
    expect(result.contents).toBe(contents);
  });

  it('should move files in hidden directories', async () => {
    const contents = 'test content';
    const context = {
      relativeFilePath: 'src/logic/.config/secrets.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'src/domain.operations/.config/secrets.json',
    );
  });

  it('should move ts files', async () => {
    const contents = 'export const processOrder = () => {};';
    const context = {
      relativeFilePath: 'src/logic/processOrder.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'src/domain.operations/processOrder.ts',
    );
  });

  it('should move nested ts files', async () => {
    const contents = 'export const generateInvoice = () => {};';
    const context = {
      relativeFilePath: 'src/logic/invoices/generateInvoice.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'src/domain.operations/invoices/generateInvoice.ts',
    );
  });
});
