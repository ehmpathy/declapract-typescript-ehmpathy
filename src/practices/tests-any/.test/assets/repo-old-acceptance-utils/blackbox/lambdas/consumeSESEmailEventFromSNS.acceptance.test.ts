import { SNSEventRecord, SNSMessage, SNSEvent } from 'aws-lambda';

import { exampleEmailClickEvent } from '../../src/.test/assets/exampleEmailClickEvent';
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
    const response = await invokeLambda({
      name: 'consumeSESEmailEventFromSNS',
      data: exampleSnsEvent,
    });
    expect(response).toBeDefined();
  });
});
