import { defineMinPackageVersionRegex } from 'declapract';
import expect from 'expect';
import { withJSONContentsParsing } from '../../../withJSONContentsParsing';

export const check = withJSONContentsParsing((contents) => {
  expect(contents).toMatchObject(
    expect.objectContaining({
      devDependencies: expect.objectContaining({
        typescript: expect.stringMatching(defineMinPackageVersionRegex('4.0.0')),
      }),
      scripts: expect.objectContaining({
        'build:clean': 'rm dist/ -rf',
        'build:compile': 'tsc -p ./tsconfig.build.json',
        build: 'npm run build:clean && npm run build:compile',
        'test:types': 'tsc -p ./tsconfig.build.json --noEmit',
      }),
    }),
  );
});
