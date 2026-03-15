import { fix } from './*.declapract';

describe('services-dir bad practice', () => {
  it('should move src/services/* to src/domain.operations/*', async () => {
    const contents = `export const userService = {};`;
    const context = {
      relativeFilePath: 'src/services/userService.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/domain.operations/userService.ts',
    );
    expect(result.contents).toEqual(contents);
  });

  it('should move nested services paths', async () => {
    const contents = `export const authService = {};`;
    const context = {
      relativeFilePath: 'src/services/auth/authService.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/domain.operations/auth/authService.ts',
    );
    expect(result.contents).toEqual(contents);
  });

  it('should move non-ts files (catch-all)', async () => {
    const contents = `{"key": "value"}`;
    const context = {
      relativeFilePath: 'src/services/config.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/domain.operations/config.json',
    );
    expect(result.contents).toEqual(contents);
  });

  it('should handle null contents', async () => {
    const context = {
      relativeFilePath: 'src/services/readme.md',
    } as any;

    const result = await fix(null, context);

    expect(result.relativeFilePath).toEqual(
      'src/domain.operations/readme.md',
    );
    expect(result.contents).toBeNull();
  });
});
