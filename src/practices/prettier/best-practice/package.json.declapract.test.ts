import { fix } from './package.json.declapract';

describe('fix package.json for prettier', () => {
  it('should add the `format` and `test:format` scripts in the correct places', async () => {
    // define example contents to fix
    const origContents = `
{
  "version": "0.8.2",
  "main": "src/index.js",
  "scripts": {
    "build": "npm run build:clean && npm run build:compile",
    "provision:schema:apply": "npx sql-schema-control apply -c provision/schema/control.yml",
    "test:types": "tsc -p ./tsconfig.build.json --noEmit",
    "test:lint": "eslint -c ./.eslintrc.js src/**/*.ts",
    "test:unit": "jest -c ./jest.unit.config.js --forceExit --coverage --verbose",
    "test:integration": "jest -c ./jest.integration.config.js --forceExit --coverage --verbose",
    "test:acceptance:locally": "npm run build && LOCALLY=true jest -c ./jest.acceptance.config.js",
    "test": "npm run test:types && npm run test:lint && npm run test:unit && npm run test:integration && npm run test:acceptance:locally",
    "test:acceptance": "npm run build && jest -c ./jest.acceptance.config.js --forceExit --verbose --runInBand",
    "prepush": "npm run test && npm run build",
    "preversion": "npm run prepush",
    "postversion": "git push origin master --tags --no-verify"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "yesql": "4.1.3"
  },
  "devDependencies": {
    "@types/aws-lambda": "8.10.40"
  }
}
    `.trim();

    // fix them
    const { contents: fixedContents } = await fix(origContents, {} as any);

    // check they look right
    expect(fixedContents).toMatchSnapshot();
  });
});
