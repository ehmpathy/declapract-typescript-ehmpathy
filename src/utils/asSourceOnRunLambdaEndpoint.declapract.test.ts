import { given, then, when } from 'test-fns';

import {
  asSourceOnRunLambdaEndpoint,
  isOnRetiredLambdaTestLib,
} from './asSourceOnRunLambdaEndpoint';

const acceptanceBefore = `import {
  createExampleAPIGatewayEvent,
  invokeLambdaForTesting,
} from 'simple-lambda-testing-methods';
import { given, then, when } from 'test-fns';

import { locally, stage } from '../environment';

describe('getWidget', () => {
  given('a widget', () => {
    when('asked by uuid', () => {
      then('it responds', async () => {
        const response = await invokeLambdaForTesting({
          service: 'svc-widgets',
          function: 'getWidget',
          stage,
          locally,
          event: { widgetUuid: 'w-1' },
        });
        expect(response.widget).toBeDefined();
      });
    });
    when('asked over the gateway', () => {
      then('it responds', async () => {
        const response = await invokeLambdaForTesting({
          service: 'svc-widgets',
          function: 'getWidgetPublic',
          stage,
          event: createExampleAPIGatewayEvent({
            httpMethod: 'POST',
            body: JSON.stringify({ widgetUuid: 'w-1' }),
          }),
        });
        expect(response.statusCode).toEqual(200);
      });
    });
  });
});
`;

const integrationBefore = `import { invokeHandlerForTesting } from 'simple-lambda-testing-methods';
import { getError } from 'test-fns';

import { handler } from './getWidget';

describe('getWidget', () => {
  it('responds', async () => {
    const response = await invokeHandlerForTesting({ event: { widgetUuid: 'w-1' }, handler });
    expect(response).toBeDefined();
  });
  it('rejects a blank uuid', async () => {
    const error = await getError(invokeHandlerForTesting({ event: { widgetUuid: '' }, handler }));
    expect(error).toBeDefined();
  });
});
`;

describe('asSourceOnRunLambdaEndpoint', () => {
  given('[case1] a blackbox acceptance test on invokeLambdaForTesting', () => {
    when('[t0] it is moved', () => {
      const after = asSourceOnRunLambdaEndpoint({ contents: acceptanceBefore });

      then('the retired import is gone, and the sdk import holds the successors', () => {
        expect(after).not.toContain('simple-lambda-testing-methods');
        expect(after).toContain(
          "import { asLambdaEvent, runLambdaEndpoint } from 'sdk-aws-lambda';",
        );
      });

      then('the caller context imports land', () => {
        expect(after).toContain(
          "import { sdkAwsLambdaEnvAccessContemp } from '@src/access/sdks/sdkAwsLambdaEnvAccessContemp';",
        );
        expect(after).toContain("import { log } from '@src/utils/logger';");
      });

      then('each call is on onSerialized, with which + at, and no stage', () => {
        expect(after).not.toContain('invokeLambdaForTesting');
        expect(after).toContain(
          "which: { service: 'svc-widgets', function: 'getWidget' }",
        );
        expect(after).toContain("at: locally ? 'local' : 'cloud'");
        expect(after).toContain("at: 'cloud'");
        expect(after).not.toMatch(/^\s*stage,$/m);
        expect(after).toContain("import { locally } from '../environment';"); // the unread stage import goes
        expect(after).toContain(
          '{ log, env: { access: sdkAwsLambdaEnvAccessContemp() } }',
        );
      });

      then('no call pins the ancient payload struct, the api gateway one included', () => {
        // sdk-aws-lambda >= 0.7.2 frames a contemp api gateway call right (sdk-aws-lambda#51)
        expect(after).not.toContain('struct:');
        expect(after).toContain('event: asLambdaEvent.fromApiGateway({');
      });

      then('the output matches snapshot', () => {
        expect(after).toMatchSnapshot();
      });

      then('a second pass is a no-op, and the check no longer detects it', () => {
        expect(asSourceOnRunLambdaEndpoint({ contents: after })).toEqual(after);
        expect(isOnRetiredLambdaTestLib({ contents: after })).toBe(false);
      });
    });
  });

  given('[case2] an integration test on invokeHandlerForTesting', () => {
    when('[t0] it is moved', () => {
      const after = asSourceOnRunLambdaEndpoint({ contents: integrationBefore });

      then('the calls move to onReferenced, with no caller context import', () => {
        expect(after).toContain(
          "import { asLambdaEndpointOutput, runLambdaEndpoint } from 'sdk-aws-lambda';",
        );
        expect(after).toContain('runLambdaEndpoint.onReferenced({ event');
        expect(after).not.toMatch(/invokeHandlerForTesting\s*\(/);
        expect(after).not.toContain('@src/utils/logger');
      });

      then('each run narrows through asLambdaEndpointOutput, so a caller fault still throws', () => {
        expect(after.match(/\.then\(asLambdaEndpointOutput\)/g)).toHaveLength(2);
        expect(after).toContain(
          "getError(runLambdaEndpoint.onReferenced({ event: { widgetUuid: '' }, handler }).then(asLambdaEndpointOutput))",
        );
        expect(after).not.toContain('@declapract:review');
      });

      then('the output matches snapshot', () => {
        expect(after).toMatchSnapshot();
      });

      then('a second pass is a no-op', () => {
        expect(asSourceOnRunLambdaEndpoint({ contents: after })).toEqual(after);
      });
    });
  });

  given('[case3] an extant sdk-aws-lambda import, and an unmapped retired name', () => {
    const before = `import { LambdaInvocationError, invokeHandlerForTesting } from 'simple-lambda-testing-methods';
import { genLambdaEndpoint } from 'sdk-aws-lambda';

export const run = () => invokeHandlerForTesting({ event: {}, handler });
`;
    const after = asSourceOnRunLambdaEndpoint({ contents: before });

    then('the sdk import merges, and the unmapped name stays behind a marker', () => {
      expect(after).toContain(
        "import { asLambdaEndpointOutput, genLambdaEndpoint, runLambdaEndpoint } from 'sdk-aws-lambda';",
      );
      expect(after.match(/from 'sdk-aws-lambda'/g)).toHaveLength(1);
      expect(after).toContain(
        "import { LambdaInvocationError } from 'simple-lambda-testing-methods';",
      );
      expect(after).toContain('@declapract:review — simple-lambda-testing-methods is retired');
    });

    then('the residual import alone does not re-trigger the check', () => {
      expect(isOnRetiredLambdaTestLib({ contents: after })).toBe(false);
      expect(asSourceOnRunLambdaEndpoint({ contents: after })).toEqual(after);
    });
  });

  given('[case4] an inline api gateway event literal, in a file with no example-event call', () => {
    const before = `import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';

import { locally } from '../environment';

describe('getWidgetPublic', () => {
  it('responds', async () => {
    const response = await invokeLambdaForTesting({
      service: 'svc-widgets',
      function: 'getWidgetPublic',
      locally,
      event: {
        httpMethod: 'POST',
        requestContext: { requestId: 'r-1' },
        body: JSON.stringify({ widgetUuid: 'w-1' }),
      },
    });
    expect(response.statusCode).toEqual(200);
  });
  it('responds to a plain event', async () => {
    const response = await invokeLambdaForTesting({
      service: 'svc-widgets',
      function: 'getWidget',
      locally,
      event: { widgetUuid: 'w-1' },
    });
    expect(response.widget).toBeDefined();
  });
});
`;
    const after = asSourceOnRunLambdaEndpoint({ contents: before });

    then('neither call is pinned: the api gateway literal takes the contemp default too', () => {
      expect(after).not.toContain('struct:');
      expect(after).toContain("which: { service: 'svc-widgets', function: 'getWidgetPublic' }");
      expect(after).toContain("which: { service: 'svc-widgets', function: 'getWidget' }");
    });

    then('the output matches snapshot', () => {
      expect(before).toMatchSnapshot('before');
      expect(after).toMatchSnapshot('after');
    });

    then('a second pass is a no-op', () => {
      expect(asSourceOnRunLambdaEndpoint({ contents: after })).toEqual(after);
    });
  });

  given('[case5] a call whose argument is not an object literal', () => {
    const before = `import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';

import { requestFor } from './requestFor';

describe('getWidgetPublic', () => {
  it('responds', async () => {
    const response = await invokeLambdaForTesting(requestFor('w-1'));
    expect(response.statusCode).toEqual(200);
  });
});
`;
    const after = asSourceOnRunLambdaEndpoint({ contents: before });

    then('the callee is renamed, with no pin and no marker: tsc names the shape move', () => {
      expect(after).toContain(
        "const response = await runLambdaEndpoint.onSerialized(requestFor('w-1'));",
      );
      expect(after).not.toContain('struct:');
      expect(after).not.toContain('@declapract:review');
      expect(after).not.toContain('__declapract');
    });

    then('the output matches snapshot', () => {
      expect(before).toMatchSnapshot('before');
      expect(after).toMatchSnapshot('after');
    });

    then('a second pass is a no-op', () => {
      expect(asSourceOnRunLambdaEndpoint({ contents: after })).toEqual(after);
    });
  });

  given('[case6] a moved file that reads a 400 off the flat body, and makes no http call', () => {
    const before = `import {
  createExampleAPIGatewayEvent,
  invokeLambdaForTesting,
} from 'simple-lambda-testing-methods';

import { locally } from '../environment';

describe('sendChatMessage', () => {
  it('rejects an absent thread', async () => {
    const result = await invokeLambdaForTesting({
      service: 'svc-gateway',
      function: 'sendChatMessage',
      locally,
      event: createExampleAPIGatewayEvent({ httpMethod: 'POST', body: '{}' }),
    });
    const body = JSON.parse(result.body);
    // the caller sees \`errorMessage\` with the reason
    expect(body).toHaveProperty('errorMessage');
    expect(body).toHaveProperty("errorType");
    expect(body.errorMessage).toContain('thread does not exist');
    expect(body.errorType).toEqual('BadRequestError');
  });
  it('rejects a bad phone', async () => {
    const result = await invokeLambdaForTesting({
      service: 'svc-gateway',
      function: 'sendChatMessage',
      locally,
      event: createExampleAPIGatewayEvent({ httpMethod: 'POST', body: '{"phone":"x"}' }),
    });
    const { errorMessage } = JSON.parse(result.body) as {
      errorMessage: string;
    };
    expect(errorMessage).toContain('not a valid phone number');
  });
});
`;
    const after = asSourceOnRunLambdaEndpoint({ contents: before });

    then('each flat property read moves to the nested contemp body', () => {
      expect(after).toContain("expect(body).toHaveProperty('error.message');");
      expect(after).toContain('expect(body).toHaveProperty("error.class");');
      expect(after).toContain("expect(body.error.message).toContain('thread does not exist');");
      expect(after).toContain("expect(body.error.class).toEqual('BadRequestError');");
    });

    then('the destructure reads the nested field, under a cast that tells the truth', () => {
      expect(after).toContain(
        'const { error: { message: errorMessage } } = JSON.parse(result.body) as {',
      );
      expect(after).toContain('      error: { class: string; message: string };');
      expect(after).not.toMatch(/^\s*errorMessage: string;$/m);
      expect(after).toContain("expect(errorMessage).toContain('not a valid phone number');");
    });

    then('a comment that names the flat field is left alone', () => {
      expect(after).toContain('// the caller sees `errorMessage` with the reason');
    });

    then('no flat read is left in code, and no marker is stamped', () => {
      const codeLines = after
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('//'));
      expect(codeLines.join('\n')).not.toMatch(/\.error(Message|Type)\b|['"]error(Message|Type)['"]/);
      expect(after).not.toContain('@declapract:review');
    });

    then('the output matches snapshot', () => {
      expect(before).toMatchSnapshot('before');
      expect(after).toMatchSnapshot('after');
    });

    then('a second pass is a no-op', () => {
      expect(asSourceOnRunLambdaEndpoint({ contents: after })).toEqual(after);
    });
  });

  given('[case7] a read off a real http response, in a file not on the retired lib', () => {
    const before = `import axios from 'axios';

describe('sendChatMessage over http', () => {
  it('rejects an absent thread', async () => {
    const error = await axios.post(url, {}).catch((caught) => caught);
    expect((error as any).response.data.errorMessage).toContain('thread does not exist');
  });
});
`;

    then('the file is untouched: the real wire answers the flat body', () => {
      expect(asSourceOnRunLambdaEndpoint({ contents: before })).toEqual(before);
    });
  });

  given('[case8] a moved file that also makes a real http call', () => {
    const before = `import axios from 'axios';
import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';

import { locally } from '../environment';

describe('sendChatMessage', () => {
  it('rejects over the lambda', async () => {
    const result = await invokeLambdaForTesting({
      service: 'svc-gateway',
      function: 'sendChatMessage',
      locally,
      event: { threadUuid: 'absent' },
    });
    expect(JSON.parse(result.body).errorMessage).toContain('thread does not exist');
  });
  it('rejects over http', async () => {
    const error = await axios.post(url, {}).catch((caught) => caught);
    expect((error as any).response.data.errorMessage).toContain('thread does not exist');
  });
});
`;
    const after = asSourceOnRunLambdaEndpoint({ contents: before });

    then('no read is rewritten', () => {
      expect(after).toContain(
        "expect(JSON.parse(result.body).errorMessage).toContain('thread does not exist');",
      );
      expect(after).toContain(
        "expect((error as any).response.data.errorMessage).toContain('thread does not exist');",
      );
      expect(after).not.toContain('.error.message');
    });

    then('each flat read gets the marker that names the move', () => {
      const lines = after.split('\n');
      const readIndexes = lines
        .map((line, index) => (line.includes('.errorMessage') && !line.trimStart().startsWith('//') ? index : -1))
        .filter((index) => index >= 0);
      expect(readIndexes).toHaveLength(2);
      readIndexes.forEach((index) => {
        expect(lines[index - 1]).toContain('// @declapract:review:');
        expect(lines[index - 1]).toContain('`error.message` / `error.class` on sdk-aws-lambda >= 0.7.2');
        expect(lines[index - 1]).toContain('an http response stays flat');
      });
      expect(after.match(/@declapract:review:/g)).toHaveLength(2);
    });

    then('the output matches snapshot', () => {
      expect(before).toMatchSnapshot('before');
      expect(after).toMatchSnapshot('after');
    });

    then('a second pass is a no-op', () => {
      expect(asSourceOnRunLambdaEndpoint({ contents: after })).toEqual(after);
    });
  });
});
