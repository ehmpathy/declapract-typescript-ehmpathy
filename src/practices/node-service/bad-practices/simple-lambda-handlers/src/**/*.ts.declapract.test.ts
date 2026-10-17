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

    // #646 — sdk-aws-lambda 0.7 has no bare `genLambdaEndpoint(` and no `.for.apiGateway(`; a
    // fix that emits either hands the adopter a call that does not exist
    it('should transform createStandardHandler call to genLambdaEndpoint.forAsk', async () => {
      const contents = `
import { createStandardHandler } from 'simple-lambda-handlers';

export const handler = createStandardHandler({ log, schema, logic });`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('genLambdaEndpoint.forAsk({ log, schema, logic })');
      expect(fixed).not.toContain('createStandardHandler');
      expect(fixed).not.toMatch(/genLambdaEndpoint\s*\(/);
    });

    it('should transform createApiGatewayHandler call to genLambdaEndpoint.forApiGateway', async () => {
      const contents = `
import { createApiGatewayHandler } from 'simple-lambda-handlers';

export const handler = createApiGatewayHandler({ log, schema, logic, cors });`;

      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain(
        'genLambdaEndpoint.forApiGateway({ log, schema, logic, cors })',
      );
      expect(fixed).not.toContain('.for.apiGateway');
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

  // #594 — the schema+invoke contract differs between the two frameworks and cannot be
  // mechanically rewritten. a rename-only migration answers 400 to every request yet typechecks,
  // so a handler CALL must carry a loud @declapract:review marker, not a silent rename.
  // .note = the marker is a COMPENSATION, not the endpoint: a consumer who runs `declapract plan`
  //         still reads only a green/red status, so the in-file marker text is the sole
  //         could-not-fire signal. the durable "could-not-fire vs passed" plan signal is owed
  //         upstream (ehmpathy/declapract#107); until it lands, this clamp verifies the marker text
  //         so a reword cannot silently drop the diagnostic.
  describe('@declapract:review marker (#594)', () => {
    it('flags an api-gateway handler call with the { headers, payload, event } contract', async () => {
      const contents = `
import { createApiGatewayHandler } from 'simple-lambda-handlers';

export const handler = createApiGatewayHandler({ log, schema, logic, cors });`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('@declapract:review');
      expect(fixed).toContain('request BODY');
      // #640 — 0.7 carries `{ headers, payload, event }`; `rawEvent` names a shape no release has
      expect(fixed).toContain('{ headers, payload, event }');
      expect(fixed).not.toContain('rawEvent');
      // snapshot the marker verbatim — user-faced output; a reword must redden a vibecheck
      expect(fixed).toMatchSnapshot('api-gateway handler call — review marker');
    });

    it('flags a standard handler call with the schema+invoke contract (no rawEvent)', async () => {
      const contents = `
import { createStandardHandler } from 'simple-lambda-handlers';

export const handler = createStandardHandler({ log, schema, logic });`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).toContain('@declapract:review');
      expect(fixed).toContain('invoke context');
      expect(fixed).toContain('({ payload }, { log })');
      expect(fixed).not.toContain('rawEvent');
      // snapshot the marker verbatim — user-faced output; a reword must redden a vibecheck
      expect(fixed).toMatchSnapshot('standard handler call — review marker');
    });

    it('does NOT mark an import-only file (no handler call to restructure)', async () => {
      const contents = `import { createApiGatewayHandler } from 'simple-lambda-handlers';`;
      const { contents: fixed } = await fix(contents, {} as any);

      expect(fixed).not.toContain('@declapract:review');
    });
  });

  // rule.require.idempotent-fixes — the fix's own output must be a fixed point, and the check must
  // stop to detect it, so a rerun of `declapract fix` neither loops nor double-prepends the marker
  describe('idempotency', () => {
    const cases = [
      {
        description: 'an api-gateway handler call',
        contents: `
import { createApiGatewayHandler } from 'simple-lambda-handlers';

export const handler = createApiGatewayHandler({ log, schema, logic, cors });`,
      },
      {
        description: 'a standard handler call',
        contents: `
import { createStandardHandler } from 'simple-lambda-handlers';

export const handler = createStandardHandler({ log, schema, logic });`,
      },
      {
        description: 'an import of both factories, with no call',
        contents: `import { createStandardHandler, createApiGatewayHandler } from 'simple-lambda-handlers';`,
      },
    ];

    cases.map((thisCase) =>
      describe(thisCase.description, () => {
        it('fix(fix(x)) === fix(x) — the second pass changes zero bytes', async () => {
          const { contents: once } = await fix(thisCase.contents, {} as any);
          const { contents: twice } = await fix(once!, {} as any);
          expect(twice).toEqual(once);
        });

        it('check throws on fix(x) — the bad practice is no longer detected', async () => {
          const { contents: once } = await fix(thisCase.contents, {} as any);
          expect(() => check(once!, {} as any)).toThrow(
            'does not import from simple-lambda-handlers',
          );
        });
      }),
    );
  });
});
