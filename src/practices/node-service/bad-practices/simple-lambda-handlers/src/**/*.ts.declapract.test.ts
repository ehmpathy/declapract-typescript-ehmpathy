import { check, fix } from './*.ts.declapract';

describe('simple-lambda-handlers source files', () => {
  describe('check', () => {
    it('should match files that import from simple-lambda-handlers', () => {
      const contents = `import { createStandardHandler } from 'simple-lambda-handlers';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with double quotes', () => {
      const contents = `import { createStandardHandler } from "simple-lambda-handlers";`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not match files without simple-lambda-handlers imports', () => {
      const contents = `import { genLambdaEndpoint } from 'sdk-aws-lambda';`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not import from simple-lambda-handlers',
      );
    });
  });

  describe('fix', () => {
    it('should transform import from simple-lambda-handlers to sdk-aws-lambda', async () => {
      const contents = `import { createStandardHandler } from 'simple-lambda-handlers';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("from 'sdk-aws-lambda'");
      expect(fixed).not.toContain('simple-lambda-handlers');
    });

    it('should transform createStandardHandler to genLambdaEndpoint in imports', async () => {
      const contents = `import { createStandardHandler } from 'simple-lambda-handlers';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('genLambdaEndpoint');
      expect(fixed).not.toContain('createStandardHandler');
    });

    it('should transform createApiGatewayHandler to genLambdaEndpoint in imports', async () => {
      const contents = `import { createApiGatewayHandler } from 'simple-lambda-handlers';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('genLambdaEndpoint');
      expect(fixed).not.toContain('createApiGatewayHandler');
    });

    it('should transform createStandardHandler call to genLambdaEndpoint', async () => {
      const contents = `
import { createStandardHandler } from 'simple-lambda-handlers';

export const handler = createStandardHandler({ log, schema, logic });`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('genLambdaEndpoint({ log, schema, logic })');
      expect(fixed).not.toContain('createStandardHandler');
    });

    it('should transform createApiGatewayHandler call to genLambdaEndpoint.for.apiGateway', async () => {
      const contents = `
import { createApiGatewayHandler } from 'simple-lambda-handlers';

export const handler = createApiGatewayHandler({ log, schema, logic, cors });`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain(
        'genLambdaEndpoint.for.apiGateway({ log, schema, logic, cors })',
      );
      expect(fixed).not.toContain('createApiGatewayHandler');
    });

    it('should handle multiple imports and dedupe genLambdaEndpoint', async () => {
      const contents = `import { createStandardHandler, createApiGatewayHandler } from 'simple-lambda-handlers';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("from 'sdk-aws-lambda'");
      expect(fixed).toContain('genLambdaEndpoint');
      expect(fixed).not.toContain('createStandardHandler');
      expect(fixed).not.toContain('createApiGatewayHandler');
      // verify no duplicate genLambdaEndpoint in import
      expect(fixed).toEqual(
        `import { genLambdaEndpoint } from 'sdk-aws-lambda';`,
      );
    });
  });
});
