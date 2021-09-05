import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';
import { withJSONContentsParsing } from '../../../withJSONContentsParsing';

export const check = withJSONContentsParsing((contents) => {
  expect(contents).toMatchObject(
    expect.objectContaining({
      devDependencies: expect.objectContaining({
        '@types/jest': expect.stringMatching(defineMinPackageVersionRegex('27.0.0')),
        jest: expect.stringMatching(defineMinPackageVersionRegex('27.0.0')),
        'ts-jest': expect.stringMatching(defineMinPackageVersionRegex('27.0.0')),
        'core-js': expect.stringMatching(defineMinPackageVersionRegex('3.6.4')),
        'simple-lambda-testing-methods': expect.stringMatching(defineMinPackageVersionRegex('0.1.1')),
      }),
      scripts: expect.objectContaining({
        'test:lint': expect.any(String), // just check it exists, the actual def checked in the linting declaration
        'test:types': expect.any(String), // just check it exists, the actual def checked in the typescript declaration
        'test:unit': 'jest -c ./jest.unit.config.js --forceExit --coverage --verbose --passWithNoTests',
        'test:integration': 'jest -c ./jest.integration.config.js --forceExit --coverage --verbose --passWithNoTests',
        'test:acceptance:locally': 'npm run build && LOCALLY=true jest -c ./jest.acceptance.config.js',
        test: 'npm run test:types && npm run test:lint && npm run test:unit && npm run test:integration && npm run test:acceptance:locally',
        'test:acceptance': 'npm run build && jest -c ./jest.acceptance.config.js --forceExit --verbose --runInBand',
      }),
    }),
  );
});
