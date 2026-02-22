import { fix } from './*.declapract';

describe('scripts-dir catch-all', () => {
  it('should move json files from src/contract/scripts/ to src/contract/commands/', async () => {
    const contents = '{}';
    const context = {
      relativeFilePath: 'src/contract/scripts/config/settings.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'src/contract/commands/config/settings.json',
    );
    expect(result.contents).toBe(contents);
  });

  it('should move files in hidden directories', async () => {
    const contents = 'test content';
    const context = {
      relativeFilePath: 'src/contract/scripts/.config/secrets.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe(
      'src/contract/commands/.config/secrets.json',
    );
  });

  it('should move ts files (same as specific pattern)', async () => {
    const contents = 'export const runDeploy = () => {};';
    const context = {
      relativeFilePath: 'src/contract/scripts/deploy.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('src/contract/commands/deploy.ts');
  });
});
