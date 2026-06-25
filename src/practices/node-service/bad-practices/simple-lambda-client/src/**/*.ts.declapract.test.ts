import { check, fix } from './*.ts.declapract';

describe('simple-lambda-client source files', () => {
  describe('check', () => {
    it('should match files that import from simple-lambda-client', () => {
      const contents = `import { invokeLambdaFunction } from 'simple-lambda-client';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with double quotes', () => {
      const contents = `import { invokeLambdaFunction } from "simple-lambda-client";`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not match files without simple-lambda-client imports', () => {
      const contents = `import { askLambdaEndpoint } from 'sdk-aws-lambda';`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not import from simple-lambda-client',
      );
    });
  });

  describe('fix', () => {
    it('should transform import from simple-lambda-client to sdk-aws-lambda', async () => {
      const contents = `import { invokeLambdaFunction } from 'simple-lambda-client';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("from 'sdk-aws-lambda'");
      expect(fixed).not.toContain('simple-lambda-client');
    });

    it('should transform invokeLambdaFunction to askLambdaEndpoint in imports', async () => {
      const contents = `import { invokeLambdaFunction } from 'simple-lambda-client';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('askLambdaEndpoint');
      expect(fixed).not.toContain('invokeLambdaFunction');
    });

    it('should transform invokeLambdaFunction call to askLambdaEndpoint', async () => {
      const contents = `
import { invokeLambdaFunction } from 'simple-lambda-client';

const result = await invokeLambdaFunction({ service, function: fn, stage, event });`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain(
        'askLambdaEndpoint({ service, function: fn, stage, event })',
      );
      expect(fixed).not.toContain('invokeLambdaFunction');
    });

    it('should handle multiple function calls', async () => {
      const contents = `
import { invokeLambdaFunction } from 'simple-lambda-client';

const result1 = await invokeLambdaFunction({ service: 'svc1', function: 'fn1', stage, event });
const result2 = await invokeLambdaFunction({ service: 'svc2', function: 'fn2', stage, event });`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("from 'sdk-aws-lambda'");
      expect(fixed).toMatch(/askLambdaEndpoint.*svc1/);
      expect(fixed).toMatch(/askLambdaEndpoint.*svc2/);
      expect(fixed).not.toContain('invokeLambdaFunction');
    });
  });
});
