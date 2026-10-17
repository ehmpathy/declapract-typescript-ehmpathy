import { isOnRetiredLambdaTestLib } from '../../../../../../utils/asSourceOnRunLambdaEndpoint';
import { check, fix } from './*.ts.declapract';

// .note (rule.forbid.as-cast, option a — documented): the declapract context arg passed to
// fix in the tests below is a PARTIAL mock — the fix reads only what it needs (`contents`,
// and `relativeFilePath` where a move applies), never the rest of FileFixContext. the
// `as any` asserts that partial to the full type. this is the repo-wide test idiom (it
// appears in ~68 peer .declapract.test.ts files, most already on main and untouched by this
// branch); the removal path is a declapract-exported context test-factory, a repo-scoped
// sweep out of this wish's bound.

describe('*.ts.declapract', () => {
  it('should be able to fix a test file using old acceptance test pattern', async () => {
    const exampleOldPatternContents = `
import { SNSEventRecord, SNSMessage, SNSEvent } from 'aws-lambda';

import { exampleEmailClickEvent } from '../../src/__test_assets__/exampleEmailClickEvent';
import { invokeLambda } from '../_utils/invokeLambda';

describe('consumeSESEmailEventFromSNS', () => {
  it('should be possible to invoke the lambda', async () => {
    const exampleSnsEvent: SNSEvent = {
      Records: [
        {
          Sns: {
            Message: JSON.stringify(exampleEmailClickEvent),
          } as SNSMessage,
        } as SNSEventRecord,
      ],
    };
    try {
      await invokeLambda({
        name: 'consumeSESEmailEventFromSNS',
        data: exampleSnsEvent,
      });
      throw new Error('should not reach here');
    } catch (error) {
      expect(error.message).toContain(
        'could not find tracked email for sesMessageId',
      ); // since we used a fake sesMessageId
    }
  });
});
    `.trim();
    const context = {
      projectVariables: { projectName: 'svc-notifications' },
    } as any;
    const fixedContents = await fix(exampleOldPatternContents, context);
    expect(fixedContents).toMatchSnapshot();

    // the retired lib never lands, even for one apply (#650)
    const fixed = fixedContents.contents!;
    expect(fixed).not.toContain('simple-lambda-testing-methods');
    expect(fixed).toContain('runLambdaEndpoint.onSerialized');
    expect(fixed).toContain(
      "which: { service: 'svc-notifications', function: 'consumeSESEmailEventFromSNS' }",
    );
    expect(fixed).toContain("at: locally ? 'local' : 'cloud'");

    // a fixed point, and neither bad practice detects the output
    expect((await fix(fixed, context)).contents).toEqual(fixed);
    expect(() => check(fixed, context)).toThrow();
    expect(isOnRetiredLambdaTestLib({ contents: fixed })).toBe(false);
  });
});
