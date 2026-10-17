import { getError } from 'test-fns';

import {
  asLambdaNodeRuntime,
  getOneLambdaNodeRuntime,
} from './getOneLambdaNodeRuntime';

const TEST_CASES = [
  { description: 'a full version with a v', nvmrc: 'v22.21.0\n', runtime: 'nodejs22.x' },
  { description: 'a full version, no v', nvmrc: '20.11.1', runtime: 'nodejs20.x' },
  { description: 'a bare major', nvmrc: '24', runtime: 'nodejs24.x' },
  { description: 'a major with a v and blank space', nvmrc: '  v18 \n', runtime: 'nodejs18.x' },
];

describe('asLambdaNodeRuntime (#552)', () => {
  TEST_CASES.map((thisCase) =>
    test(`casts ${thisCase.description}`, () => {
      expect(asLambdaNodeRuntime({ nvmrc: thisCase.nvmrc })).toEqual(
        thisCase.runtime,
      );
    }),
  );

  ['lts/*', 'node', '', 'v22.x'].map((nvmrc) =>
    test(`fails loud on a pin that names no major: '${nvmrc}'`, async () => {
      const error = await getError(async () => asLambdaNodeRuntime({ nvmrc }));
      expect(error.message).toContain('.nvmrc names no node major');
    }),
  );

  test('a bare unit call (no project root) yields the node practice default', () => {
    expect(getOneLambdaNodeRuntime({ projectRoot: null })).toEqual('nodejs22.x');
  });
});
