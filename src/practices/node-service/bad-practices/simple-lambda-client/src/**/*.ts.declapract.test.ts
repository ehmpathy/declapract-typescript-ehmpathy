import { check, fix } from './*.ts.declapract';

// each `{} as any` context below is a documented cast (rule.forbid.as-cast): this declaration reads
// no context field. removal path: a declapract partial-context builder.
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
    it('should move every other imported name to sdk-aws-lambda', async () => {
      const contents = `import { invokeLambdaFunction, LambdaInvocationError } from 'simple-lambda-client';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain(
        "import { LambdaInvocationError } from 'sdk-aws-lambda';",
      );
      expect(fixed).not.toContain('simple-lambda-client');
    });

    it('should move invokeLambdaFunction onto the ancient ask helper in imports (#631)', async () => {
      const contents = `import { invokeLambdaFunction } from 'simple-lambda-client';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain(
        "import { sdkAwsLambdaAskAncient } from '@src/access/sdks/sdkAwsLambdaAskAncient';",
      );
      expect(fixed).toContain("import { log } from '@src/utils/logger';");
      expect(fixed).not.toContain('invokeLambdaFunction');
    });

    it('should move an invokeLambdaFunction call onto sdkAwsLambdaAskAncient, address + payload bound together (#631)', async () => {
      const contents = `
import { invokeLambdaFunction } from 'simple-lambda-client';

const result = await invokeLambdaFunction({ service, function: fn, stage, event });`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain(
        'sdkAwsLambdaAskAncient(\n  {\n    which: { service: service, function: fn },\n    event: event,\n  },\n  { log },\n)',
      );
      expect(fixed).not.toContain('stage');
      expect(fixed).not.toContain('askLambdaEndpoint'); // a bare ask would send the contemp envelope
      expect(fixed).toMatchSnapshot();
    });

    it('should carry a cache into the context', async () => {
      const contents = `import { invokeLambdaFunction } from 'simple-lambda-client';
const out = await invokeLambdaFunction({ service: 'svc1', function: 'fn1', stage, event, cache });`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toContain('{ log, cache: { response: cache } }');
    });

    it('should handle multiple function calls, and be a fixed point', async () => {
      const contents = `
import { invokeLambdaFunction } from 'simple-lambda-client';

const result1 = await invokeLambdaFunction({ service: 'svc1', function: 'fn1', stage, event });
const result2 = await invokeLambdaFunction({ service: 'svc2', function: 'fn2', stage, event });`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain("which: { service: 'svc1', function: 'fn1' }");
      expect(fixed).toContain("which: { service: 'svc2', function: 'fn2' }");
      expect(fixed).not.toContain('invokeLambdaFunction');
      expect(() => check(fixed!, {} as any)).toThrow();
      expect((await fix(fixed!, {} as any)).contents).toEqual(fixed);
    });
  });
});
