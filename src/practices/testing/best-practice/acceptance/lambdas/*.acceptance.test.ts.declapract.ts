import chalk from 'chalk';
import { FileCheckFunction } from 'declapract';
import expect from 'expect';

export const check: FileCheckFunction = (contents, context) => {
  if (!contents)
    throw new Error('expected at least one lambda acceptance test');

  // check that each import was found
  const expectedImports = [
    "import { invokeLambdaForTesting } from 'simple-lambda-testing-methods';",
    "import { stage } from '../../src/utils/environment';",
    "import { locally } from '../environment';",
  ];
  const missedImports = expectedImports.filter(
    (expectedImport) => !contents.includes(expectedImport),
  );
  if (missedImports.length)
    throw new Error(
      `
${chalk.green(`- Expected imports ${['', ...expectedImports].join('\n  - ')}`)}
      `.trim(),
    );

  const expectedTestName = context.relativeFilePath // same name as the file
    .split('/')
    .slice(-1)[0]
    .replace('.acceptance.test.ts', ''); // remove the extension from the file
  const expectedDescribe = `
describe('${expectedTestName}', () => {
  `.trim();
  expect(contents).toContain(expectedDescribe);
};
