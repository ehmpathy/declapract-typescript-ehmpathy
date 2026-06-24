import { check, fix } from './*.ts.declapract';

describe('simple-log-methods source file bad-practice', () => {
  it('should match files that import from simple-log-methods', () => {
    const contents = `import { generateLogMethods } from 'simple-log-methods';`;
    expect(() => check(contents, {} as any)).not.toThrow();
  });

  it('should not match files without simple-log-methods imports', () => {
    const contents = `import { genLogMethods } from 'sdk-logs';`;
    expect(() => check(contents, {} as any)).toThrow('does not match bad practice');
  });

  it('should replace simple-log-methods imports with sdk-logs and flow commit', async () => {
    const contents = `import { generateLogMethods } from 'simple-log-methods';\n\nexport const log = generateLogMethods();`;
    const result = await fix(contents, {} as any);

    expect(result.contents).toContain("from 'sdk-logs'");
    expect(result.contents).not.toContain('simple-log-methods');
    expect(result.contents).toContain('genLogMethods');
    expect(result.contents).not.toContain('generateLogMethods');

    // verify sdk-environment import and commit flow
    expect(result.contents).toContain("import { getEnvironment } from 'sdk-environment';");
    expect(result.contents).toContain('getEnvironment.static().commit');
  });

  it('should handle files that already use genLogMethods but wrong module', async () => {
    const contents = `import { genLogMethods } from 'simple-log-methods';`;
    const result = await fix(contents, {} as any);

    expect(result.contents).toContain("from 'sdk-logs'");
    expect(result.contents).toContain('genLogMethods');
  });
});
