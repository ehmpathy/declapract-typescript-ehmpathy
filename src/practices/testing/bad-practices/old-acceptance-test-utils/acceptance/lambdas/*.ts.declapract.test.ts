import { fix } from './*.ts.declapract';

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
    const fixedContents = await fix(exampleOldPatternContents, {
      projectVariables: { serviceName: 'svc-notifications' },
    } as any);
    expect(fixedContents).toMatchSnapshot();
  });
});
